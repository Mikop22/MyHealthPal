"""
XRPL Testnet Flask server for oracle webhook transactions.
"""

import os
from typing import Any

from flask import Flask, jsonify, request
from xrpl.clients import JsonRpcClient
from xrpl.transaction import submit_and_wait
from xrpl.utils import str_to_hex
from xrpl.wallet import Wallet, generate_faucet_wallet

try:
    from xrpl.models.transactions import DIDSet, EscrowFinish, MPTokenIssuanceCreate
except ImportError:
    from xrpl.models import DIDSet, EscrowFinish, MPTokenIssuanceCreate  # type: ignore

try:
    from xrpl.models.transactions import MPTokenIssuanceCreateFlag
except ImportError:
    MPTokenIssuanceCreateFlag = None  # type: ignore

app = Flask(__name__)

XRPL_TESTNET_RPC_URL = os.getenv(
    "XRPL_TESTNET_RPC_URL",
    "https://s.altnet.rippletest.net:51234",
)
ORACLE_SEED = os.getenv("ORACLE_SEED")

_client: JsonRpcClient | None = None
_wallet: Wallet | None = None


def xrpl_client() -> JsonRpcClient:
    global _client
    if _client is None:
        _client = JsonRpcClient(XRPL_TESTNET_RPC_URL)
    return _client


def oracle_wallet() -> Wallet:
    global _wallet
    if _wallet is not None:
        return _wallet

    if ORACLE_SEED:
        _wallet = Wallet.from_seed(ORACLE_SEED)
    else:
        # Testnet-only convenience wallet for Oracle identity.
        _wallet = generate_faucet_wallet(xrpl_client())
    return _wallet


ORACLE_WALLET = oracle_wallet()


def _request_data() -> dict[str, Any]:
    if request.is_json:
        data = request.get_json(silent=True) or {}
        if not isinstance(data, dict):
            return {}
        return data
    return request.form.to_dict(flat=True)


def submit_mock_did_set() -> dict[str, Any]:
    wallet = oracle_wallet()
    tx = DIDSet(
        account=wallet.address,
        did_document=str_to_hex('{"id":"did:xrpl:testnet:patient"}'),
        uri=str_to_hex("did:xrpl:testnet:patient"),
    )
    result = submit_and_wait(tx, xrpl_client(), wallet).result
    return {
        "tx_hash": result.get("hash"),
        "engine_result": result.get("meta", {}).get("TransactionResult"),
        "account": wallet.address,
        "did": "did:xrpl:testnet:patient",
    }


def submit_mpt_issuance() -> dict[str, Any]:
    wallet = oracle_wallet()

    kwargs: dict[str, Any] = {
        "account": wallet.address,
        "asset_scale": 0,
        "transfer_fee": 0,
        "mptoken_metadata": str_to_hex('{"asset_class":"rwa"}'),
        "maximum_amount": "1",
    }
    if MPTokenIssuanceCreateFlag is not None:
        kwargs["flags"] = MPTokenIssuanceCreateFlag.TF_MPT_CAN_TRANSFER

    tx = MPTokenIssuanceCreate(**kwargs)
    result = submit_and_wait(tx, xrpl_client(), wallet).result
    return {
        "tx_hash": result.get("hash"),
        "engine_result": result.get("meta", {}).get("TransactionResult"),
        "tag": "rwa",
        "window": "7d",
    }


def submit_escrow_finish() -> dict[str, Any]:
    wallet = oracle_wallet()
    tx = EscrowFinish(
        account=wallet.address,
        owner=wallet.address,
        offer_sequence=123456,
    )
    result = submit_and_wait(tx, xrpl_client(), wallet).result
    return {
        "tx_hash": result.get("hash"),
        "engine_result": result.get("meta", {}).get("TransactionResult"),
        "owner": wallet.address,
        "offer_sequence": 123456,
    }


@app.route("/health", methods=["GET"])
def health() -> tuple[Any, int]:
    return jsonify({"ok": True, "network": XRPL_TESTNET_RPC_URL}), 200


@app.route("/webhook/acute", methods=["POST"])
def webhook_acute() -> tuple[Any, int]:
    payload = _request_data()

    try:
        did_tx = submit_mock_did_set()
        mpt_tx = submit_mpt_issuance()
    except Exception as exc:
        return jsonify({"error": str(exc), "route": "/webhook/acute"}), 500

    return (
        jsonify(
            {
                "received": payload,
                "oracle_address": ORACLE_WALLET.address,
                "didset": did_tx,
                "mpt_issuance": mpt_tx,
                "note": "Submitted DIDSet + MPTokenIssuanceCreate from the global Oracle wallet.",
            }
        ),
        200,
    )


@app.route("/webhook/longitudinal", methods=["POST"])
def webhook_longitudinal() -> tuple[Any, int]:
    payload = _request_data()

    try:
        escrow_tx = submit_escrow_finish()
    except Exception as exc:
        return jsonify({"error": str(exc), "route": "/webhook/longitudinal"}), 500

    return (
        jsonify(
            {
                "received": payload,
                "oracle_address": ORACLE_WALLET.address,
                "oracle_action": "EscrowFinish",
                "escrow_finish": escrow_tx,
                "note": "Submitted EscrowFinish from Oracle wallet using hardcoded owner and offer_sequence.",
            }
        ),
        200,
    )


if __name__ == "__main__":
    oracle_wallet()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
