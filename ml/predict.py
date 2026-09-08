import joblib
import pandas as pd

model = joblib.load("model.pkl")

data = pd.DataFrame({
    "route_id": [2],
    "hour": [8],
    "weather": ["Rainy"],
    "is_holiday": [0],
    "traffic_level": ["High"],
    "capacity": [450],
    "current_buses": [9]
})

prediction = model.predict(data)

print("Predicted Passenger Count:", round(prediction[0]))