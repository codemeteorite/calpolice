import os
import sys
import random
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
import urllib.request
import urllib.parse
import re

load_dotenv()

app = Flask(__name__)
CORS(app)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL = "openai/gpt-oss-120b"

FALLBACK_JOKES = [
    "Why did the coffee file a complaint? It was feeling brewed up.",
    "I told my fitness tracker I was tired. It said, 'That's a step in the right direction.'",
    "My scale and I had a disagreement. It said I was too heavy, I said I was just well-rounded.",
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "I tried to eat healthy at the gym. It was a bit of a protein mismatch.",
    "The smoothie and I broke up. It said I was too much to blend with.",
    "My water bottle told me to stay hydrated. I said, 'I’m trying, it’s a lot of pressure.'",
    "I signed up for a marathon of naps. I think I’m in the recovery phase.",
    "My fridge said I need more greens. I told it, 'I’m trying, but the snacks keep filing a report.'",
]


def clean_json(content):
    if content is None:
        return ""
    text = str(content).strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text, flags=re.IGNORECASE)
    if text.lower().startswith("json"):
        text = text[4:].lstrip()

    for marker in ("{", "["):
        positions = [index for index, char in enumerate(text) if char == marker]
        for index in positions:
            candidate = text[index:]
            try:
                parsed, _ = json.JSONDecoder().raw_decode(candidate)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, (dict, list)):
                return json.dumps(parsed, ensure_ascii=False)
    return text


def extract_json_object(text):
    if text is None:
        return None
    cleaned = clean_json(text)
    if not cleaned:
        return None

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        brace_start = cleaned.find("{")
        brace_end = cleaned.rfind("}")
        if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
            candidate = cleaned[brace_start:brace_end + 1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    return None


def normalize_meal_name(name):
    return re.sub(r"\s+", " ", str(name or "")).strip().lower()


def merge_suggestions(primary, secondary, limit):
    merged = []
    seen_names = set()

    for item in list(primary) + list(secondary):
        if not isinstance(item, dict):
            continue

        name = str(item.get("name", "") or "").strip()
        normalized_name = normalize_meal_name(name)
        if not name or not normalized_name or normalized_name in seen_names:
            continue

        seen_names.add(normalized_name)
        merged.append(item)
        if len(merged) >= limit:
            break

    return merged


def validate_food_suggestions(payload):
    if not isinstance(payload, dict):
        raise ValueError("AI response was not a JSON object.")

    suggestions = payload.get("suggestions")
    if not isinstance(suggestions, list) or not suggestions:
        raise ValueError("AI response missing a non-empty suggestions array.")

    normalized = []
    seen_names = set()

    for index, item in enumerate(suggestions):
        if not isinstance(item, dict):
            raise ValueError(f"Suggestion #{index} is not a JSON object.")

        name = str(item.get("name", "")).strip()
        if not name:
            raise ValueError(f"Suggestion #{index} is missing a name.")

        normalized_name = normalize_meal_name(name)
        if normalized_name in seen_names:
            continue
        seen_names.add(normalized_name)

        required_numeric_fields = ["calories", "protein", "carbs", "fat"]
        for field in required_numeric_fields:
            try:
                value = float(item.get(field, 0) or 0)
            except (TypeError, ValueError):
                raise ValueError(f"Suggestion '{name}' has invalid numeric fields.")
            if value < 0:
                raise ValueError(f"Suggestion '{name}' has negative numeric values.")

        is_veg = item.get("isVeg", True)
        if isinstance(is_veg, str):
            is_veg = is_veg.strip().lower() in {"true", "yes", "1", "veg", "vegetarian"}

        normalized.append({
            "name": name,
            "calories": int(float(item.get("calories", 0) or 0)) if float(item.get("calories", 0) or 0).is_integer() else round(float(item.get("calories", 0) or 0), 1),
            "protein": int(float(item.get("protein", 0) or 0)) if float(item.get("protein", 0) or 0).is_integer() else round(float(item.get("protein", 0) or 0), 1),
            "carbs": int(float(item.get("carbs", 0) or 0)) if float(item.get("carbs", 0) or 0).is_integer() else round(float(item.get("carbs", 0) or 0), 1),
            "fat": int(float(item.get("fat", 0) or 0)) if float(item.get("fat", 0) or 0).is_integer() else round(float(item.get("fat", 0) or 0), 1),
            "isVeg": bool(is_veg),
            "reason": str(item.get("reason") or "Balanced option for your goal."),
            "portionSize": str(item.get("portionSize") or "1 serving"),
        })

    if not normalized:
        raise ValueError("No valid food suggestions were found after validation.")

    goal = payload.get("goal", "maintain")
    is_veg = bool(payload.get("isVeg", True))
    fallback = fallback_food_suggestions(goal, is_veg)["suggestions"]
    payload["suggestions"] = merge_suggestions(normalized, fallback, 18)
    payload["wellnessAdvice"] = str(payload.get("wellnessAdvice") or "Stay hydrated and keep meals balanced.")
    payload["fallback"] = bool(payload.get("fallback", False))
    return payload


def is_rate_limit_error(exc):
    if exc is None:
        return False

    status_code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    if status_code == 429:
        return True

    text = str(exc).lower()
    budget = ["rate limit", "429", "too many requests", "quota exceeded", "exceeded your current quota"]
    return any(keyword in text for keyword in budget)


def get_retry_after_seconds(exc=None, default=30):
    if exc is not None:
        response = getattr(exc, "response", None)
        if response is not None:
            headers = getattr(response, "headers", {}) or {}
            retry_after = headers.get("Retry-After") or headers.get("retry-after")
            if retry_after is not None:
                try:
                    return max(1, int(retry_after))
                except (TypeError, ValueError):
                    pass

    return default


def rate_limit_response(message=None, retry_after=None):
    retry_after = retry_after if retry_after is not None else 30
    payload = {
        "error": "ai_rate_limited",
        "message": message or "AI suggestions are temporarily rate-limited. Please wait a moment and try again.",
        "retryAfter": retry_after,
    }
    response = jsonify(payload)
    response.headers["Retry-After"] = str(retry_after)
    return response, 429


def fallback_food_suggestions(goal, is_veg):
    goal_key = str(goal).lower()
    if is_veg:
        suggestions = [
            {"name": "Greek Yogurt Berry Bowl", "calories": 280, "protein": 22, "carbs": 28, "fat": 7, "isVeg": True, "reason": "High-protein and fiber-rich for satiety and steady energy.", "portionSize": "1 bowl"},
            {"name": "Lentil Quinoa Salad", "calories": 350, "protein": 18, "carbs": 38, "fat": 10, "isVeg": True, "reason": "Plant protein plus complex carbs help support a balanced calorie target.", "portionSize": "1 large bowl"},
            {"name": "Tofu Veggie Stir-Fry", "calories": 420, "protein": 25, "carbs": 32, "fat": 16, "isVeg": True, "reason": "Lean protein and vegetables support fullness without excess heaviness.", "portionSize": "1 plate"},
            {"name": "Chickpea Oatmeal Bowl", "calories": 310, "protein": 16, "carbs": 36, "fat": 8, "isVeg": True, "reason": "Good fiber and carb balance for steady energy and recovery.", "portionSize": "1 bowl"},
            {"name": "Avocado Egg Toast", "calories": 340, "protein": 20, "carbs": 24, "fat": 14, "isVeg": True, "reason": "A satisfying option with healthy fats and a solid protein base.", "portionSize": "2 slices"},
            {"name": "Cottage Cheese Fruit Plate", "calories": 260, "protein": 24, "carbs": 20, "fat": 6, "isVeg": True, "reason": "Portable, high-protein, and easy to fit into a calorie-controlled day.", "portionSize": "1 serving"},
            {"name": "Paneer and Brown Rice Bowl", "calories": 430, "protein": 27, "carbs": 36, "fat": 15, "isVeg": True, "reason": "A filling vegetarian option that balances protein, carbs, and satiety.", "portionSize": "1 bowl"},
            {"name": "Black Bean Protein Salad", "calories": 390, "protein": 23, "carbs": 35, "fat": 12, "isVeg": True, "reason": "Rich in fiber and plant protein for stable energy and appetite control.", "portionSize": "1 salad"},
            {"name": "Hummus Veggie Wrap", "calories": 330, "protein": 16, "carbs": 30, "fat": 12, "isVeg": True, "reason": "Easy to portion and strong on fiber for steady nutrition.", "portionSize": "1 wrap"},
            {"name": "Soy Milk Smoothie", "calories": 290, "protein": 18, "carbs": 25, "fat": 8, "isVeg": True, "reason": "A convenient protein boost when you need a quick, nutrient-dense option.", "portionSize": "1 shake"},
            {"name": "Rajma Rice Bowl", "calories": 420, "protein": 20, "carbs": 44, "fat": 11, "isVeg": True, "reason": "Legumes and grains make this a satisfying, budget-friendly meal.", "portionSize": "1 bowl"},
            {"name": "Soya Chunks Curry", "calories": 410, "protein": 30, "carbs": 26, "fat": 13, "isVeg": True, "reason": "A high-protein vegetarian staple that supports recovery and fullness.", "portionSize": "1 plate"},
            {"name": "Moong Dal Khichdi", "calories": 350, "protein": 19, "carbs": 40, "fat": 9, "isVeg": True, "reason": "Gentle on digestion while still delivering useful protein and energy.", "portionSize": "1 bowl"},
            {"name": "Chickpea Spinach Curry", "calories": 390, "protein": 18, "carbs": 34, "fat": 14, "isVeg": True, "reason": "High fiber and plant protein help keep hunger in check.", "portionSize": "1 serving"},
            {"name": "Cottage Cheese Salad", "calories": 310, "protein": 25, "carbs": 18, "fat": 10, "isVeg": True, "reason": "Lean protein plus veggies keeps the meal filling without being too heavy.", "portionSize": "1 bowl"},
            {"name": "Vegetable Upma", "calories": 300, "protein": 12, "carbs": 38, "fat": 9, "isVeg": True, "reason": "A balanced vegetarian carb source that works well for busy days.", "portionSize": "1 bowl"},
            {"name": "Edamame Rice Bowl", "calories": 360, "protein": 21, "carbs": 30, "fat": 11, "isVeg": True, "reason": "A plant-based protein option that supports steady energy and muscle health.", "portionSize": "1 bowl"},
            {"name": "Peanut Butter Banana Toast", "calories": 360, "protein": 13, "carbs": 31, "fat": 16, "isVeg": True, "reason": "A nutrient-dense combo of protein, healthy fats, and carbs.", "portionSize": "2 slices"},
        ]
    else:
        suggestions = [
            {"name": "Chicken Rice Bowl", "calories": 420, "protein": 35, "carbs": 40, "fat": 10, "isVeg": False, "reason": "Lean protein and slow-digesting carbs make it ideal for appetite control.", "portionSize": "1 bowl"},
            {"name": "Salmon Quinoa Plate", "calories": 480, "protein": 33, "carbs": 30, "fat": 22, "isVeg": False, "reason": "Balanced macros with healthy fats helps support satiety and recovery.", "portionSize": "1 plate"},
            {"name": "Turkey Veggie Wrap", "calories": 370, "protein": 28, "carbs": 30, "fat": 11, "isVeg": False, "reason": "High protein and easy portion control for a busy day.", "portionSize": "1 wrap"},
            {"name": "Lean Beef Stir-Fry", "calories": 460, "protein": 32, "carbs": 28, "fat": 18, "isVeg": False, "reason": "Protein-dense and filling while still being nutrient balanced.", "portionSize": "1 serving"},
            {"name": "Egg and Oatmeal Combo", "calories": 340, "protein": 22, "carbs": 32, "fat": 12, "isVeg": False, "reason": "Simple, steady energy with a strong protein base.", "portionSize": "1 meal"},
            {"name": "Greek Yogurt Protein Snack", "calories": 260, "protein": 24, "carbs": 18, "fat": 6, "isVeg": False, "reason": "Low-effort, high-protein option that supports muscle recovery.", "portionSize": "1 serving"},
            {"name": "Chicken Veggie Salad", "calories": 390, "protein": 31, "carbs": 22, "fat": 13, "isVeg": False, "reason": "Very filling with a strong protein base and good fiber.", "portionSize": "1 large bowl"},
            {"name": "Grilled Fish Rice Bowl", "calories": 430, "protein": 30, "carbs": 34, "fat": 15, "isVeg": False, "reason": "Good balance of protein and complex carbs for energy consistency.", "portionSize": "1 bowl"},
            {"name": "Turkey Chili Bowl", "calories": 410, "protein": 34, "carbs": 28, "fat": 12, "isVeg": False, "reason": "High-protein and comforting while still being nutrient dense.", "portionSize": "1 bowl"},
            {"name": "Shrimp Quinoa Plate", "calories": 420, "protein": 32, "carbs": 29, "fat": 13, "isVeg": False, "reason": "Light but filling with strong protein quality for recovery.", "portionSize": "1 plate"},
            {"name": "Beef Lentil Curry", "calories": 470, "protein": 35, "carbs": 26, "fat": 18, "isVeg": False, "reason": "A calorie-strong, satisfying option for muscle support and fullness.", "portionSize": "1 serving"},
            {"name": "Egg White Omelet", "calories": 290, "protein": 26, "carbs": 12, "fat": 8, "isVeg": False, "reason": "Protein-focused and low in fat while still being very satisfying.", "portionSize": "1 omelet"},
            {"name": "Tuna Potato Salad", "calories": 360, "protein": 28, "carbs": 26, "fat": 10, "isVeg": False, "reason": "A simple, high-protein meal with enough carbs for steady energy.", "portionSize": "1 bowl"},
            {"name": "Chicken Sweet Potato Plate", "calories": 440, "protein": 33, "carbs": 37, "fat": 12, "isVeg": False, "reason": "Excellent mix of lean protein and carbs for balanced fuel.", "portionSize": "1 plate"},
            {"name": "Baked Salmon Greens", "calories": 430, "protein": 29, "carbs": 18, "fat": 22, "isVeg": False, "reason": "Nutrient-dense and satiating without being too heavy.", "portionSize": "1 serving"},
            {"name": "Turkey Oat Bowl", "calories": 350, "protein": 30, "carbs": 24, "fat": 9, "isVeg": False, "reason": "Strong protein and steady carbs make this reliable for performance days.", "portionSize": "1 bowl"},
            {"name": "Cottage Cheese Chicken Bowl", "calories": 410, "protein": 36, "carbs": 21, "fat": 11, "isVeg": False, "reason": "Great for appetite control and recovery with good protein distribution.", "portionSize": "1 bowl"},
            {"name": "Protein Pancakes with Eggs", "calories": 380, "protein": 29, "carbs": 27, "fat": 13, "isVeg": False, "reason": "A high-protein breakfast that offers energy and satiety.", "portionSize": "2 pancakes"},
        ]

    random.shuffle(suggestions)

    if "lose" in goal_key:
        for item in suggestions:
            item["reason"] = "Supports a calorie deficit while keeping protein high and meals satisfying."
    elif "gain" in goal_key:
        for item in suggestions:
            item["reason"] = "Higher-calorie but still balanced for lean muscle and energy support."
    else:
        for item in suggestions:
            item["reason"] = "A balanced choice for steady energy and consistent nutrition."

    advice_options = [
        "Keep water intake steady and aim for a balanced plate with protein, fiber, and a colorful vegetable source.",
        "Stay hydrated and keep meals centered on protein, fiber, and volume so you feel full without excess calories.",
        "Add more veggies and keep your protein portions steady to support energy and recovery throughout the day."
    ]

    return {
        "suggestions": suggestions,
        "wellnessAdvice": random.choice(advice_options),
        "fallback": True,
    }


def fallback_exercise_suggestions(goal, category):
    goal_key = str(goal).lower()
    base = [
        {"name": "Bodyweight Squats", "category": "strength", "description": "Strengthens legs and glutes while building practical lower-body power.", "duration": "15", "caloriesBurnedPerHour": 320, "suggestedSets": 3, "suggestedReps": "12-15", "restBetweenSets": "45s", "difficulty": "beginner", "context": "Solid option for improving strength without high strain."},
        {"name": "Yoga Flow", "category": "flexibility", "description": "Helps improve mobility, balance, and recovery after other exercise sessions.", "duration": "15", "caloriesBurnedPerHour": 180, "suggestedSets": 1, "suggestedReps": "15 min", "restBetweenSets": "0s", "difficulty": "beginner", "context": "Useful if stress is elevated and you need recovery-focused movement."},
        {"name": "Dumbbell Press", "category": "strength", "description": "Builds upper-body strength and muscle control for overall fitness.", "duration": "15", "caloriesBurnedPerHour": 350, "suggestedSets": 3, "suggestedReps": "8-12", "restBetweenSets": "60s", "difficulty": "intermediate", "context": "Good for increasing strength while staying within a manageable workload."},
        {"name": "Incline Walking", "category": "cardio", "description": "A steady cardio option that raises heart rate without putting unnecessary strain on the joints.", "duration": "20", "caloriesBurnedPerHour": 280, "suggestedSets": 1, "suggestedReps": "20-30 min", "restBetweenSets": "0s", "difficulty": "beginner", "context": "Great for sustainable energy and stress reduction."},
        {"name": "Plank Holds", "category": "strength", "description": "Builds core stability and full-body endurance with minimal equipment.", "duration": "10", "caloriesBurnedPerHour": 240, "suggestedSets": 3, "suggestedReps": "30-45s", "restBetweenSets": "30s", "difficulty": "beginner", "context": "Helpful for posture and total-body control."},
        {"name": "Jump Rope Intervals", "category": "cardio", "description": "Alternates quick rope bursts with short rest periods to keep cardio efficient.", "duration": "12", "caloriesBurnedPerHour": 420, "suggestedSets": 4, "suggestedReps": "20-30s", "restBetweenSets": "30s", "difficulty": "intermediate", "context": "A strong option for conditioning and quick calorie burn."},
        {"name": "Hamstring Stretch Series", "category": "flexibility", "description": "Improves lower-body mobility and reduces stiffness after training.", "duration": "12", "caloriesBurnedPerHour": 150, "suggestedSets": 2, "suggestedReps": "1-2 rounds", "restBetweenSets": "15s", "difficulty": "beginner", "context": "Good for recovery and lower-body mobility work."},
        {"name": "Bent-Over Rows", "category": "strength", "description": "Targets the back and arms while improving posture and upper-body strength.", "duration": "15", "caloriesBurnedPerHour": 330, "suggestedSets": 3, "suggestedReps": "8-12", "restBetweenSets": "60s", "difficulty": "intermediate", "context": "Useful for muscular balance and better functional strength."},
        {"name": "Step-Up March", "category": "cardio", "description": "Improves leg endurance and heart rate with a simple step pattern.", "duration": "15", "caloriesBurnedPerHour": 260, "suggestedSets": 2, "suggestedReps": "10 each leg", "restBetweenSets": "30s", "difficulty": "beginner", "context": "Good for a low-impact cardio option that still feels effective."},
        {"name": "Chair Hip Mobility", "category": "flexibility", "description": "Improves hip range of motion and helps reduce stiffness from sitting.", "duration": "10", "caloriesBurnedPerHour": 120, "suggestedSets": 2, "suggestedReps": "8 each side", "restBetweenSets": "15s", "difficulty": "beginner", "context": "Helps with movement quality and recovery between harder sessions."},
        {"name": "Goblet Squats", "category": "strength", "description": "Builds lower-body strength while training control and stability.", "duration": "15", "caloriesBurnedPerHour": 340, "suggestedSets": 3, "suggestedReps": "10-12", "restBetweenSets": "45s", "difficulty": "intermediate", "context": "A strong foundational strength move for consistent progression."},
        {"name": "Brisk Power Walk", "category": "cardio", "description": "Elevates heart rate and helps support calorie burn without overloading the joints.", "duration": "20", "caloriesBurnedPerHour": 300, "suggestedSets": 1, "suggestedReps": "20 min", "restBetweenSets": "0s", "difficulty": "beginner", "context": "A reliable, sustainable habit for general fitness and stress control."},
    ]

    if category and category != 'all':
        for item in base:
            item['category'] = category

    if "lose" in goal_key:
        for item in base:
            item['context'] = "Supports calorie burn and consistency without overloading the body."
    elif "gain" in goal_key:
        for item in base:
            item['context'] = "Helps drive training quality and progressive strength while supporting muscle gain."
    else:
        for item in base:
            item['context'] = "Keeps the plan balanced across cardio, strength, and recovery."

    random.shuffle(base)
    return {"suggestions": base[:12], "fallback": True}


def fallback_analyze_meal(meal_description, goal):
    text = (meal_description or "").lower()
    calories = 320
    protein = 18
    carbs = 32
    fat = 12
    fiber = 6

    if "egg" in text or "omelet" in text or "breakfast" in text:
        calories = 420
        protein = 24
        carbs = 28
        fat = 18
        fiber = 5
    elif "salad" in text:
        calories = 310
        protein = 16
        carbs = 26
        fat = 11
        fiber = 8
    elif "rice" in text or "pasta" in text or "bowl" in text:
        calories = 500
        protein = 22
        carbs = 60
        fat = 14
        fiber = 6
    elif "protein" in text or "chicken" in text or "turkey" in text:
        calories = 460
        protein = 30
        carbs = 25
        fat = 18
        fiber = 5

    if "lose" in str(goal).lower():
        feedback = "This looks like a moderate meal; keep portions steady and add more vegetables or lean protein where possible."
        suggestions = ["Add a side of greens or vegetables.", "Choose a leaner protein source if you want a lighter meal.", "Pair the meal with water instead of sugary drinks."]
    elif "gain" in str(goal).lower():
        feedback = "This meal is a solid energy base; adding a fruit or whole grain could help push it toward your calorie target."
        suggestions = ["Add a banana, oats, or granola for extra calories.", "Choose a higher-calorie carb like rice or potatoes.", "Include a protein shake or yogurt if you need more recovery fuel."]
    else:
        feedback = "This is a fairly balanced meal; adding fiber and vegetables would keep energy levels steadier throughout the day."
        suggestions = ["Add more vegetables to increase fiber.", "Keep protein portions consistent for satiety.", "Aim for a colorful plate to improve micronutrient intake."]

    return {
        "estimatedCalories": calories,
        "protein": protein,
        "carbs": carbs,
        "fat": fat,
        "fiber": fiber,
        "items": [{
            "name": "Meal estimate",
            "calories": calories,
            "protein": protein,
            "carbs": carbs,
            "fat": fat,
        }],
        "healthScore": 7,
        "feedback": feedback,
        "suggestions": suggestions,
        "isBalanced": True,
    }


def get_real_youtube_id(exercise_name):
    lookup = {
        "bodyweight squats": "vwALXgok6YI",
        "squats": "vwALXgok6YI",
        "yoga flow": "v7AYKMP6rOE",
        "dumbbell press": "XnP71QhJw6s",
        "incline walking": "XrJ7cl_eHfE",
        "walking": "XrJ7cl_eHfE",
        "pushups": "XnP71QhJw6s",
        "lunges": "3kLk9c8b4J8",
        "deadlift": "1R9i8dQY7xg",
        "plank": "pSHjTRCQxIw",
    }

    key = (exercise_name or "").strip().lower()
    if key in lookup:
        return lookup[key]

    query = urllib.parse.quote(exercise_name + " exercise tutorial")
    url = f"https://www.youtube.com/results?search_query={query}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req, timeout=3).read().decode('utf-8')
        match = re.search(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
        if match:
            video_id = match.group(1)
            if video_id != "dQw4w9WgXcQ":
                return video_id
    except Exception as e:
        print(f"YouTube search failed for {exercise_name}: {e}")
    return ""


@app.route("/", methods=["GET"])
def index():
    import random
    import uuid

    topics = ["programming", "food", "animals", "space", "history", "everyday life", "technology", "sports", "music", "math", "science", "coffee", "cats", "dogs"]
    tones = ["clean and punchy", "sarcastic", "playful", "quick one-liner", "absurd but clever"]
    topic = random.choice(topics)
    tone = random.choice(tones)
    unique_seed = uuid.uuid4().hex[:8]

    prompt = (
        f"Create one fresh, original, short joke about {topic}. "
        f"Make it {tone}, highly readable, and different from common internet jokes. "
        f"Use unique seed {unique_seed} to ensure it feels new. Return only the joke text."
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=1.1,
            max_tokens=80,
            timeout=30,
        )
        joke = response.choices[0].message.content.strip()
        joke = re.sub(r"^\s*(Here(?:'s| is)|Sure|Absolutely)\s*[:\-]?\s*", "", joke, flags=re.IGNORECASE)
        if len(joke) < 12:
            raise ValueError("Joke too short")
    except Exception:
        joke = random.choice(FALLBACK_JOKES)

    return jsonify({
        "status": "success",
        "message": "CalPolice AI service is up and running! 🚀",
        "generatedjoke": joke,
        "topic": topic,
    })

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "CalPolice AI service running 🧠"})


@app.route("/analyze", methods=["POST"])
def analyze_meal():
    """
    Accepts a natural language meal description and user profile,
    returns a structured calorie + macro breakdown with suggestions.
    """
    data = request.json or {}
    meal_description = data.get("mealDescription", "")
    user_profile = data.get("userProfile", {})

    goal = user_profile.get("goal", "maintain")
    daily_target = user_profile.get("dailyCalorieTarget", 2000)

    prompt = f"""
You are a professional nutritionist AI. Analyze the following meal description and return ONLY valid JSON.

Meal: "{meal_description}"
User Goal: {goal}
Daily Calorie Target: {daily_target} kcal

Return JSON with these exact fields:
{{
  "estimatedCalories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>,
  "fiber": <number in grams>,
  "items": [
    {{"name": "<food item>", "calories": <number>, "protein": <g>, "carbs": <g>, "fat": <g>}}
  ],
  "healthScore": <1-10>,
  "feedback": "<brief nutritional feedback>",
  "suggestions": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "isBalanced": <true/false>
}}

If you cannot identify a food item, make a reasonable estimate. Return ONLY the JSON, no extra text.
"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=800,
            timeout=30,
        )

        content = response.choices[0].message.content
        cleaned = clean_json(content)
        if not cleaned:
            raise ValueError("Empty AI response")

        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError:
            cleaned = re.sub(r"^[^\{]*", "", cleaned)
            cleaned = re.sub(r"[^\}\]]+$", "", cleaned)
            result = json.loads(cleaned)

        required = ["estimatedCalories", "protein", "carbs", "fat", "fiber", "items", "healthScore", "feedback", "suggestions", "isBalanced"]
        if not all(key in result for key in required):
            raise ValueError("AI response missing required keys")

        return jsonify(result)

    except Exception as e:
        if is_rate_limit_error(e):
            retry_after = get_retry_after_seconds(e)
            return rate_limit_response(retry_after=retry_after)

        print("[AI ANALYZE ERROR]", str(e), "RAW:", content if 'content' in locals() else "<none>")
        fallback = fallback_analyze_meal(meal_description, goal)
        fallback["fallback"] = True
        return jsonify(fallback), 200


@app.route("/suggest-foods", methods=["POST"])
def suggest_foods():
    """
    Returns AI-generated food suggestions based on goal, diet preference, and wellness context.
    """
    data = request.json or {}
    goal = data.get("goal", "maintain")
    is_veg = data.get("isVeg", True)
    recent_meals = data.get("recentMeals", [])
    wellness = data.get("wellness", {})

    water_intake = wellness.get("totalWaterMl", 0)
    stress_level = wellness.get("stressLevel", 0)
    recent_names = sorted({normalize_meal_name(name) for name in recent_meals if str(name or "").strip()})
    recent_str = ", ".join(recent_names) if recent_names else "None"

    diet_type = "strictly VEGETARIAN (absolutely no meat, poultry, or fish)" if is_veg else "strictly NON-VEGETARIAN (must contain meat, poultry, or fish)"
    if is_veg:
        goal_map = {
            "lose_weight": "calorie deficit, high fiber, plant-based protein (tofu, lentils, beans, no meat)",
            "gain_weight": "calorie surplus, high plant-based protein (no meat), complex carbs",
            "maintain": "balanced macros, varied vegetarian nutrients (no meat)"
        }
    else:
        goal_map = {
            "lose_weight": "calorie deficit, high fiber, lean protein (chicken, turkey, fish)",
            "gain_weight": "calorie surplus, high protein (beef, chicken, eggs), complex carbs",
            "maintain": "balanced macros, varied nutrients"
        }
    goal_desc = goal_map.get(goal, "balanced diet")

    hydration_context = ""
    if water_intake < 1500:
        hydration_context = "The user is currently DEHYDRATED. Prioritize water-rich foods (e.g., cucumber, watermelon, soups) and include a hydration tip in the feedback."

    prompt = f"""
You are a nutritionist AI. Suggest exactly 18 specific foods for someone with the following profile:
- Diet: {diet_type}
- Goal: {goal_desc}
- DO NOT SUGGEST THESE FOODS: {recent_str}
- Wellness: Today's water intake: {water_intake}ml, Stress level: {stress_level}/10.
{hydration_context}

Return ONLY valid JSON with a top-level object containing a "suggestions" array and a "wellnessAdvice" string.
{{
  "suggestions": [
    {{
      "name": "<food name>",
      "calories": <per serving>,
      "protein": <grams>,
      "carbs": <grams>,
      "fat": <grams>,
      "isVeg": <true/false>,
      "reason": "<1 sentence why this is good for their goal/wellness>",
      "portionSize": "<e.g. 1 cup, 100g>"
    }}
  ],
  "wellnessAdvice": "<short 1-sentence tip based on hydration/stress>"
}}

The list must contain at least 18 food items. Do not include markdown fences, commentary, or extra text.
"""

    raw_content = ""
    finish_reason = None
    try:
        request_kwargs = {
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.4,
            "max_tokens": 700,
            "timeout": 30,
        }

        try:
            response = client.chat.completions.create(
                **request_kwargs,
                response_format={"type": "json_object"},
            )
        except Exception as response_format_error:
            message = str(response_format_error).lower()
            if "response_format" not in message and "json_object" not in message:
                raise
            response = client.chat.completions.create(**request_kwargs)

        raw_content = response.choices[0].message.content or ""
        finish_reason = getattr(response.choices[0], "finish_reason", None)

        result = extract_json_object(raw_content)
        if result is None:
            raise ValueError("AI output could not be parsed into a JSON object.")

        validated = validate_food_suggestions(result)
        return jsonify(validated)

    except Exception as e:
        if is_rate_limit_error(e):
            retry_after = get_retry_after_seconds(e)
            return rate_limit_response(retry_after=retry_after)

        app.logger.warning(
            "[AI SUGGEST FOOD ERROR] reason=%s finish_reason=%s response_excerpt=%s",
            str(e),
            finish_reason,
            (raw_content[:280] if raw_content else "<none>").replace("\n", " "),
        )
        fallback = fallback_food_suggestions(goal, is_veg)
        fallback["fallback"] = True
        return jsonify(fallback), 200


@app.route("/suggest-exercises", methods=["POST"])
def suggest_exercises():
    """
    Returns AI-generated exercise suggestions based on goal and wellness context.
    """
    data = request.json or {}
    goal = data.get("goal", "maintain")
    category = data.get("category", "")
    wellness = data.get("wellness", {})
    
    stress_level = wellness.get("stressLevel", 0)
    
    goal_map = {
        "lose_weight": "high intensity interval training (HIIT) and cardio to maximize calorie burn",
        "gain_weight": "hypertrophy and strength training to build muscle mass",
        "maintain": "a balanced mix of cardio and resistance training for overall fitness"
    }
    goal_desc = goal_map.get(goal, "balanced fitness")
    
    # Add stress context
    stress_context = ""
    if stress_level >= 7:
        stress_context = f"The user has HIGH STRESS ({stress_level}/10). REGARDLESS of the category requested, suggest at least 2 low-intensity, recovery-focused movements like mobility, yoga, or deep breathing."
    
    category_instruction = f" focusing heavily on {category} exercises " if category else " providing a diverse mix across different domains (e.g. 1 cardio, 1 strength, 1 flexibility, and 1 dumbbell exercise) "
    
    recent_exercises = data.get("recentExercises", [])
    recent_str = ", ".join(recent_exercises) if recent_exercises else "None"

    prompt = f"""
You are an expert personal trainer AI. Suggest exactly 12 specific exercises{category_instruction}for someone whose goal is to {goal_desc}.
Current Stress Level: {stress_level}/10.
- DO NOT SUGGEST THESE EXERCISES: {recent_str}
{stress_context}

Return ONLY valid JSON in this exact format:
{{
  "suggestions": [
    {{
      "name": "<Exercise Name>",
      "category": "<cardio/strength/flexibility>",
      "description": "<1 short sentence describing the exercise>",
      "duration": "<e.g. 15, 30> (must be a number string representing minutes)",
      "caloriesBurnedPerHour": <number, e.g. 400>,
      "suggestedSets": <e.g. 3>,
      "suggestedReps": "<e.g. 10-12>",
      "restBetweenSets": "<e.g. 60s>",
      "difficulty": "<beginner/intermediate/advanced>",
      "youtubeVideoId": "<leave blank if no verified ID is available; do not invent video URLs or IDs>",
      "context": "<briefly explain why this is good given their stress/energy level>"
    }}
  ]
}}

The list must contain at least 12 exercises. Use realistic, tailored items. Do not invent or guess YouTube video IDs. If a verified ID is unavailable, leave the field blank and rely on a separate verification stage. Return ONLY the JSON.
"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=900,
            timeout=30,
        )

        content = response.choices[0].message.content
        cleaned = clean_json(content)
        if not cleaned:
            raise ValueError("Empty exercise response")

        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError:
            cleaned = re.sub(r"^[^\{]*", "", cleaned)
            cleaned = re.sub(r"[^\}\]]+$", "", cleaned)
            result = json.loads(cleaned)

        if "suggestions" not in result or not isinstance(result.get("suggestions"), list):
            raise ValueError("Response missing suggestions list")

        for ex in result["suggestions"]:
            ex["youtubeVideoId"] = get_real_youtube_id(ex.get("name", "workout"))

        if len(result["suggestions"]) < 12:
            fallback = fallback_exercise_suggestions(goal, category)
            result["suggestions"] = merge_suggestions(result["suggestions"], fallback["suggestions"], 12)

        return jsonify(result)

    except Exception as e:
        if is_rate_limit_error(e):
            retry_after = get_retry_after_seconds(e)
            return rate_limit_response(retry_after=retry_after)

        print("[AI SUGGEST EXERCISES ERROR]", str(e), "RAW:", content if 'content' in locals() else "<none>")
        fallback = fallback_exercise_suggestions(goal, category)
        fallback["fallback"] = True
        return jsonify(fallback), 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("FLASK_PORT", 5001)))
    is_debug = os.getenv("FLASK_ENV", "development") != "production"
    print(f"[CalPolice AI] Starting on port {port} (debug={is_debug})")
    app.run(host="0.0.0.0", port=port, debug=is_debug)
