"""XRP Ledger wallet service using xrpl-py on Testnet."""

import asyncio
import logging
import os

from xrpl.wallet import generate_faucet_wallet, Wallet
from xrpl.clients import JsonRpcClient
from xrpl.models.transactions import Payment
from xrpl.transaction import submit_and_wait
from xrpl.utils import xrp_to_drops

logger = logging.getLogger(__name__)

TESTNET_URL = "https://s.altnet.rippletest.net:51234"


def _create_wallet_sync() -> dict:
    """Synchronously generate a funded XRP Testnet wallet."""
    client = JsonRpcClient(TESTNET_URL)
    wallet = generate_faucet_wallet(client, debug=False)
    return {
        "address": wallet.address,
        "seed": wallet.seed,
    }


async def create_patient_wallet() -> dict:
    """Generate a new funded XRP Testnet wallet for a patient.

    Runs the synchronous xrpl-py call in a thread pool to avoid
    blocking the async event loop.

    Returns:
        dict with keys: address, seed
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _create_wallet_sync)


def _send_xrp_sync(target_address: str, amount: int) -> dict:
    """Synchronously send XRP from the research fund wallet to a target address.

    The research fund wallet seed is read from the XRP_RESEARCH_FUND_SEED
    environment variable.  On Testnet a faucet wallet is generated as a
    fallback when the env var is missing (dev/demo only).
    """
    client = JsonRpcClient(TESTNET_URL)

    # Load the research-fund wallet from env, or generate one for dev
    fund_seed = os.getenv("XRP_RESEARCH_FUND_SEED", "")
    if fund_seed:
        fund_wallet = Wallet.from_seed(fund_seed)
    else:
        logger.warning(
            "XRP_RESEARCH_FUND_SEED not set — generating a disposable "
            "faucet wallet for this payout (dev/demo only)."
        )
        fund_wallet = generate_faucet_wallet(client, debug=False)

    # Build and submit the payment transaction
    payment = Payment(
        account=fund_wallet.address,
        destination=target_address,
        amount=xrp_to_drops(amount),
    )
    response = submit_and_wait(payment, client, fund_wallet)
    return {
        "tx_hash": response.result.get("hash", ""),
        "status": response.result.get("meta", {}).get("TransactionResult", ""),
    }


async def process_research_payout(target_address: str, amount: int = 10) -> dict:
    """Send a research-participation payout to the patient's XRPL wallet.

    Designed to be invoked as a FastAPI BackgroundTask so that ledger
    consensus does not block the main request thread.

    Args:
        target_address: The patient's public XRPL wallet address.
        amount: Amount of XRP to send (default 10).

    Returns:
        dict with tx_hash and status from the XRPL ledger.
    """
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, _send_xrp_sync, target_address, amount
        )
        logger.info(
            "XRPL payout of %s XRP to %s succeeded: %s",
            amount,
            target_address,
            result,
        )
        return result
    except Exception as exc:
        logger.error(
            "XRPL payout of %s XRP to %s failed: %s",
            amount,
            target_address,
            exc,
        )
        raise
