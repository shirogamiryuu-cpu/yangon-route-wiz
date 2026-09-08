# Passenger-demand ML pipeline

Source material for the demand / overcrowding / bus-allocation model used by the
**Demand & Crowding AI** page (`/demand`).

| File | Purpose |
| --- | --- |
| `transport_data_5000.csv` | 5,000 hourly operations records: date, day_of_week, route_id (1–5), hour, weather, is_holiday, traffic_level, capacity, current_buses → `passenger_count` (target) |
| `train_model.py` | scikit-learn pipeline (OneHotEncoder + RandomForestRegressor), saves `model.pkl` |
| `predict.py` | Single-scenario passenger-count prediction |
| `overcrowding.py` | Turns predicted demand into occupancy % and a risk level (Low / Medium / High / Critical) |
| `bus_allocation.py` | Computes required buses (50 seats each) and additional buses needed |

## How it runs inside the web app

The web app runs on an edge runtime that cannot load a Python `model.pkl`. The
same Random Forest was therefore retrained with identical features and exported
as portable JSON trees:

- `src/lib/ai/models/demand-forest.json` — 25 trees, max depth 12, MAE ≈ 41 passengers, R² ≈ 0.80 on a 20% held-out split
- `src/lib/ai/demand-model.server.ts` — inference (tree traversal + forest averaging)
- `src/lib/ai/demand-model.ts` — occupancy/risk thresholds and bus-allocation maths, ported 1:1 from `overcrowding.py` and `bus_allocation.py`
- `src/lib/ai/demand.functions.ts` — server API used by the page

To retrain with new data: update the CSV, run `python train_model.py` for the
scikit-learn metrics, then re-export the JSON forest so the app picks up the new
model.
