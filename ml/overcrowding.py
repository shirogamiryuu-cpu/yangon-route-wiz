import joblib
import pandas as pd

# Load trained model
model = joblib.load("model.pkl")

# Input scenario
data = pd.DataFrame({
    "route_id": [2],
    "hour": [8],
    "weather": ["Rainy"],
    "is_holiday": [0],
    "traffic_level": ["High"],
    "capacity": [450],
    "current_buses": [9]
})

# Predict
predicted_demand = round(model.predict(data)[0])

capacity = 450

occupancy = (predicted_demand / capacity) * 100

if occupancy < 70:
    risk = "Low"
elif occupancy < 90:
    risk = "Medium"
elif occupancy <= 100:
    risk = "High"
else:
    risk = "Critical"

print("Predicted Demand:", predicted_demand)
print("Capacity:", capacity)
print("Occupancy:", round(occupancy, 2), "%")
print("Risk Level:", risk)