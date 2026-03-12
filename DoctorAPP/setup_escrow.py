"""Create a self-destination escrow on XRPL Testnet.

Scenario:
- Generate/fund a faucet wallet for a mock "Insurance Clinic".
- Lock 50,000,000 drops (simulating 50 RLUSD) via EscrowCreate.
- Enforce mandatory CancelAfter exactly 1 hour from current Ripple Epoch time.
"""

from __future__ import annotations

import time

from xrpl.clients import JsonRpcClient
from xrpl.transaction import submit_and_wait
from xrpl.wallet import generate_faucet_wallet

try:
    from xrpl.models.transactions import EscrowCreate
except ImportError:
    from xrpl.models import EscrowCreate  # type: ignore

XRPL_TESTNET_RPC_URL = "https://s.altnet.rippletest.net:51234"
AMOUNT_DROPS = "50000000"  # 50,000,000 drops (simulated 50 RLUSD)
RIPPLE_EPOCH_OFFSET = 946684800  # Unix timestamp for 2000-01-01T00:00:00Z


def current_ripple_epoch() -> int:
    """Return current time in Ripple Epoch seconds."""
    return int(time.time()) - RIPPLE_EPOCH_OFFSET


def main() -> None:
    client = JsonRpcClient(XRPL_TESTNET_RPC_URL)

    # Testnet faucet wallet for mock "Insurance Clinic".
    clinic_wallet = generate_faucet_wallet(client)

    ripple_now = current_ripple_epoch()
    cancel_after = ripple_now + 3600  # Mandatory XLS-85-style timeout: +1 hour.

    # Strictly enforce mandatory CancelAfter for this simulation.
    if cancel_after <= ripple_now:
        raise RuntimeError("CancelAfter must be strictly greater than current Ripple Epoch time.")

    escrow_create_tx = EscrowCreate(
        account=clinic_wallet.address,
        destination=clinic_wallet.address,
        amount=AMOUNT_DROPS,
        cancel_after=cancel_after,
    )

    tx_response = submit_and_wait(escrow_create_tx, client, clinic_wallet)
    tx_result = tx_response.result

    tx_hash = tx_result.get("hash")
    sequence = tx_result.get("Sequence")
    if sequence is None:
        sequence = tx_result.get("tx_json", {}).get("Sequence")

    print(f"Insurance Clinic address: {clinic_wallet.address}")
    print(f"EscrowCreate tx hash: {tx_hash}")
    print(f"EscrowCreate Sequence: {sequence}")


if __name__ == "__main__":
    main()
