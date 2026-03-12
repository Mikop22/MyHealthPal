"""CUSUM (Cumulative Sum) change-point detection for biometric time series."""

from __future__ import annotations

import statistics


def detect_changepoint(
    values: list[float],
    dates: list[str],
    k: float = 0.5,
    h: float = 1.5,
) -> dict | None:
    """Detect the first sustained shift in a time series using CUSUM.

    Parameters
    ----------
    values : list[float]
        Ordered metric values (oldest → newest).
    dates : list[str]
        Corresponding date strings (ISO format or week_start).
    k : float
        Slack parameter — fraction of std dev allowed before accumulating.
    h : float
        Decision threshold — number of std devs the cumulative sum must
        exceed to trigger a change-point detection.

    Returns
    -------
    dict | None
        ``{"date": str, "direction": "up"|"down", "cusum_value": float}``
        for the first detected change-point, or ``None`` if none found.
    """
    if len(values) < 4 or len(values) != len(dates):
        return None

    # Use the first 3 observations as the baseline target mean
    target = statistics.mean(values[:3])
    std = statistics.stdev(values) if len(values) > 1 else 1.0
    if std == 0:
        return None

    slack = k * std
    threshold = h * std

    s_high = 0.0  # detects upward shift
    s_low = 0.0   # detects downward shift

    for i in range(len(values)):
        s_high = max(0.0, s_high + (values[i] - target) - slack)
        s_low = max(0.0, s_low + (target - values[i]) - slack)

        if s_high > threshold:
            return {
                "date": dates[i],
                "direction": "up",
                "cusum_value": round(s_high, 4),
            }
        if s_low > threshold:
            return {
                "date": dates[i],
                "direction": "down",
                "cusum_value": round(s_low, 4),
            }

    return None
