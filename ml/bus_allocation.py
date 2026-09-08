import math
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

# Predict demand
predicted_demand = round(model.predict(data)[0])

# Bus settings
current_buses = 9
bus_capacity = 50

# Calculate buses needed
required_buses = math.ceil(predicted_demand / bus_capacity)

additional_buses = max(0, required_buses - current_buses)

print("Predicted Demand:", predicted_demand)
print("Current Buses:", current_buses)
print("Required Buses:", required_buses)
print("Additional Buses Needed:", additional_buses)
