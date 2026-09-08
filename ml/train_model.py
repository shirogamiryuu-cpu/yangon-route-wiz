# train_model.py

import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# Load Data
df = pd.read_csv("transport_data_5000.csv")

# Features
X = df[
    [
        "route_id",
        "hour",
        "weather",
        "is_holiday",
        "traffic_level",
        "capacity",
        "current_buses"
    ]
]

# Target
y = df["passenger_count"]

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

# Categorical columns
categorical = [
    "weather",
    "traffic_level"
]

# Numerical columns
numerical = [
    "route_id",
    "hour",
    "is_holiday",
    "capacity",
    "current_buses"
]

preprocessor = ColumnTransformer(
    transformers=[
        (
            "cat",
            OneHotEncoder(handle_unknown="ignore"),
            categorical
        )
    ],
    remainder="passthrough"
)

model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", model)
])

# Train
pipeline.fit(X_train, y_train)

# Test
predictions = pipeline.predict(X_test)

print("MAE:", mean_absolute_error(y_test, predictions))
print("R2 :", r2_score(y_test, predictions))

# Save
joblib.dump(pipeline, "model.pkl")

print("Model saved!")