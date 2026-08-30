"""
Task bank for the Self-Evolve demo agent — 10 task types.

Each task type ships with:
  - a FLAWED solver : a realistic, common mistake an LLM makes first time
  - a CORRECTED solver: the right answer once a lesson is stored in memory
  - a LESSON : the reusable insight (error_tag + lesson_text)
  - a CRITIQUE: the self-critique the agent produces on failure
"""

from __future__ import annotations

import math
import random
import uuid
from dataclasses import dataclass, field


@dataclass
class Task:
    id: str
    type: str
    prompt: str
    correct_answer: float
    tolerance: float
    params: dict = field(default_factory=dict)

    def verify(self, answer) -> bool:
        try:
            return abs(float(answer) - float(self.correct_answer)) <= self.tolerance
        except (TypeError, ValueError):
            return False


# ===========================================================================
# 1. Percentage Discount
#    Mistake: treat discount % as a flat dollar subtraction
# ===========================================================================
def _gen_percentage_discount(rng: random.Random) -> Task:
    price = rng.randint(20, 500)
    discount = rng.choice([5, 10, 12, 15, 20, 25, 30])
    correct = round(price * (1 - discount / 100), 2)
    return Task(
        id=str(uuid.uuid4()), type="percentage_discount",
        prompt=(f"A product costs ${price}. The store offers a {discount}% discount. "
                f"What is the final price after the discount (in dollars, 2 decimal places)?"),
        correct_answer=correct, tolerance=0.01,
        params={"price": price, "discount": discount},
    )


def _solve_percentage_discount(params: dict, apply_lesson: bool) -> float:
    price, discount = params["price"], params["discount"]
    if apply_lesson:
        return round(price * (1 - discount / 100), 2)
    return round(price - discount, 2)  # flawed: flat subtraction


# ===========================================================================
# 2. Kilometre to Miles
#    Mistake: use rounded factor 0.6 instead of precise 0.621371
# ===========================================================================
def _gen_km_to_miles(rng: random.Random) -> Task:
    km = rng.randint(50, 900)
    correct = round(km * 0.621371, 3)
    return Task(
        id=str(uuid.uuid4()), type="km_to_miles",
        prompt=f"Convert {km} kilometers to miles. Give the answer to 3 decimal places.",
        correct_answer=correct, tolerance=0.5,
        params={"km": km},
    )


def _solve_km_to_miles(params: dict, apply_lesson: bool) -> float:
    km = params["km"]
    factor = 0.621371 if apply_lesson else 0.6
    return round(km * factor, 3)


# ===========================================================================
# 3. Last-N Index
#    Mistake: off-by-one when counting positions from the end of a 1-based list
# ===========================================================================
def _gen_last_n_index(rng: random.Random) -> Task:
    n = rng.randint(6, 60)
    offset = rng.randint(1, 4)
    correct = n - (offset - 1)
    return Task(
        id=str(uuid.uuid4()), type="last_n_index",
        prompt=(f"A list has {n} items, indexed starting at 1. What is the 1-based "
                f"position of the item that is {offset} from the end? "
                f"(The very last item counts as 1 from the end.)"),
        correct_answer=correct, tolerance=1e-9,
        params={"n": n, "offset": offset},
    )


def _solve_last_n_index(params: dict, apply_lesson: bool) -> int:
    n, offset = params["n"], params["offset"]
    if apply_lesson:
        return n - (offset - 1)
    return n - offset  # flawed: off-by-one


# ===========================================================================
# 4. Compound Interest
#    Mistake: use simple-interest formula P*(1 + r*n/100) instead of P*(1+r/100)^n
# ===========================================================================
def _gen_compound_interest(rng: random.Random) -> Task:
    principal = rng.randint(500, 5000) * 10  # multiples of 10 for cleaner numbers
    rate = rng.choice([3, 5, 7, 8, 10, 12])
    years = rng.randint(2, 8)
    correct = round(principal * (1 + rate / 100) ** years, 2)
    return Task(
        id=str(uuid.uuid4()), type="compound_interest",
        prompt=(f"You invest ${principal} at {rate}% annual compound interest. "
                f"What is the total amount after {years} years? (2 decimal places)"),
        correct_answer=correct, tolerance=0.5,
        params={"principal": principal, "rate": rate, "years": years},
    )


def _solve_compound_interest(params: dict, apply_lesson: bool) -> float:
    p, r, n = params["principal"], params["rate"], params["years"]
    if apply_lesson:
        return round(p * (1 + r / 100) ** n, 2)
    return round(p * (1 + r / 100 * n), 2)  # flawed: simple interest


# ===========================================================================
# 5. Time-Speed-Distance
#    Mistake: forget to convert minutes → hours when speed is km/h
# ===========================================================================
def _gen_time_speed_distance(rng: random.Random) -> Task:
    speed = rng.choice([40, 50, 60, 80, 90, 100, 120])
    time_min = rng.choice([30, 45, 90, 150, 180])
    correct = round(speed * time_min / 60, 2)
    return Task(
        id=str(uuid.uuid4()), type="time_speed_distance",
        prompt=(f"A car travels at {speed} km/h for {time_min} minutes. "
                f"How many kilometers does it cover? (2 decimal places)"),
        correct_answer=correct, tolerance=0.05,
        params={"speed": speed, "time_min": time_min},
    )


def _solve_time_speed_distance(params: dict, apply_lesson: bool) -> float:
    speed, time_min = params["speed"], params["time_min"]
    if apply_lesson:
        return round(speed * time_min / 60, 2)
    return round(speed * time_min, 2)  # flawed: forgot /60


# ===========================================================================
# 6. Binary to Decimal
#    Mistake: read bit positions left-to-right instead of right-to-left
# ===========================================================================
def _gen_binary_to_decimal(rng: random.Random) -> Task:
    # Pick a number whose binary is NOT a palindrome (so reversed != original)
    while True:
        n = rng.randint(33, 220)
        bits = bin(n)[2:]
        if int(bits[::-1], 2) != n:
            break
    return Task(
        id=str(uuid.uuid4()), type="binary_to_decimal",
        prompt=f"Convert the binary number {bin(n)[2:]} to decimal (base 10).",
        correct_answer=n, tolerance=1e-9,
        params={"decimal": n, "binary_str": bin(n)[2:]},
    )


def _solve_binary_to_decimal(params: dict, apply_lesson: bool) -> int:
    bits = params["binary_str"]
    if apply_lesson:
        return int(bits, 2)                   # correct: right-to-left (standard)
    return int(bits[::-1], 2)                 # flawed: reversed bit order


# ===========================================================================
# 7. Composite Area (Rectangle + Semicircle)
#    Mistake: use full-circle area π*r² instead of semicircle π*r²/2
# ===========================================================================
def _gen_area_composite(rng: random.Random) -> Task:
    length = rng.randint(5, 20)
    width = rng.choice([4, 6, 8, 10, 12])   # even → clean radius
    correct = round(length * width + math.pi * (width / 2) ** 2 / 2, 2)
    return Task(
        id=str(uuid.uuid4()), type="area_composite",
        prompt=(f"A shape consists of a rectangle ({length} m long, {width} m wide) with "
                f"a semicircle attached to one of its {width} m ends. "
                f"What is the total area in m²? (2 decimal places, use π = {math.pi:.6f})"),
        correct_answer=correct, tolerance=0.5,
        params={"length": length, "width": width},
    )


def _solve_area_composite(params: dict, apply_lesson: bool) -> float:
    l, w = params["length"], params["width"]
    r = w / 2
    if apply_lesson:
        return round(l * w + math.pi * r ** 2 / 2, 2)
    return round(l * w + math.pi * r ** 2, 2)    # flawed: full circle


# ===========================================================================
# 8. Probability Union P(A ∪ B)
#    Mistake: forget to subtract the intersection → P(A) + P(B) instead of P(A)+P(B)-P(A∩B)
# ===========================================================================
def _gen_probability_union(rng: random.Random) -> Task:
    # Generate clean fractions out of 20
    a = rng.randint(3, 9)
    b = rng.randint(3, 9)
    c = rng.randint(1, min(a, b))  # intersection ≤ min(a, b)
    correct = round((a + b - c) / 20, 3)
    pa, pb, pc = a / 20, b / 20, c / 20
    return Task(
        id=str(uuid.uuid4()), type="probability_union",
        prompt=(f"P(A) = {pa:.2f}, P(B) = {pb:.2f}, P(A∩B) = {pc:.2f}. "
                f"What is P(A∪B)? (3 decimal places)"),
        correct_answer=correct, tolerance=0.002,
        params={"a": a, "b": b, "c": c},
    )


def _solve_probability_union(params: dict, apply_lesson: bool) -> float:
    a, b, c = params["a"], params["b"], params["c"]
    if apply_lesson:
        return round((a + b - c) / 20, 3)
    return round((a + b) / 20, 3)             # flawed: forgot -P(A∩B)


# ===========================================================================
# 9. Roman Numeral → Decimal
#    Mistake: pure additive sum, ignoring subtractive notation (IV, IX, XL…)
# ===========================================================================
_ROMAN_SUBTRACTIVE = [
    (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
    (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
    (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
]
_ROMAN_VALS = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}

# Numbers that REQUIRE subtractive notation (so flawed ≠ correct)
_SUBTRACTIVE_POOL = [4, 9, 14, 19, 24, 29, 34, 39, 40, 44, 49,
                     54, 59, 64, 69, 74, 79, 84, 89, 90, 94, 99]


def _int_to_roman(num: int) -> str:
    result = ""
    for value, symbol in _ROMAN_SUBTRACTIVE:
        while num >= value:
            result += symbol
            num -= value
    return result


def _roman_additive(roman: str) -> int:
    """Flawed: just sum all symbol values, ignoring subtractive pairs."""
    return sum(_ROMAN_VALS.get(ch, 0) for ch in roman)


def _gen_roman_numeral(rng: random.Random) -> Task:
    n = rng.choice(_SUBTRACTIVE_POOL)
    roman = _int_to_roman(n)
    return Task(
        id=str(uuid.uuid4()), type="roman_numeral",
        prompt=f"Convert the Roman numeral '{roman}' to a decimal integer.",
        correct_answer=n, tolerance=1e-9,
        params={"decimal": n, "roman": roman},
    )


def _solve_roman_numeral(params: dict, apply_lesson: bool) -> int:
    roman = params["roman"]
    if apply_lesson:
        # Correct: proper subtractive algorithm
        total, prev = 0, 0
        for ch in reversed(roman):
            val = _ROMAN_VALS.get(ch, 0)
            if val < prev:
                total -= val
            else:
                total += val
            prev = val
        return total
    return _roman_additive(roman)              # flawed: additive only


# ===========================================================================
# 10. Fahrenheit → Celsius
#    Mistake: multiply before subtracting → F*5/9 - 32 instead of (F-32)*5/9
# ===========================================================================
def _gen_temperature_conversion(rng: random.Random) -> Task:
    f = rng.choice([50, 59, 68, 77, 86, 95, 104, 122, 140, 167, 212])
    correct = round((f - 32) * 5 / 9, 2)
    return Task(
        id=str(uuid.uuid4()), type="temperature_conversion",
        prompt=(f"Convert {f}°F to Celsius. "
                f"Formula: C = (F − 32) × 5/9. Give the answer to 2 decimal places."),
        correct_answer=correct, tolerance=0.05,
        params={"fahrenheit": f},
    )


def _solve_temperature_conversion(params: dict, apply_lesson: bool) -> float:
    f = params["fahrenheit"]
    if apply_lesson:
        return round((f - 32) * 5 / 9, 2)
    return round(f * 5 / 9 - 32, 2)           # flawed: wrong order of operations


# ===========================================================================
# Registries
# ===========================================================================
GENERATORS = {
    "percentage_discount":    _gen_percentage_discount,
    "km_to_miles":            _gen_km_to_miles,
    "last_n_index":           _gen_last_n_index,
    "compound_interest":      _gen_compound_interest,
    "time_speed_distance":    _gen_time_speed_distance,
    "binary_to_decimal":      _gen_binary_to_decimal,
    "area_composite":         _gen_area_composite,
    "probability_union":      _gen_probability_union,
    "roman_numeral":          _gen_roman_numeral,
    "temperature_conversion": _gen_temperature_conversion,
}

SOLVERS = {
    "percentage_discount":    _solve_percentage_discount,
    "km_to_miles":            _solve_km_to_miles,
    "last_n_index":           _solve_last_n_index,
    "compound_interest":      _solve_compound_interest,
    "time_speed_distance":    _solve_time_speed_distance,
    "binary_to_decimal":      _solve_binary_to_decimal,
    "area_composite":         _solve_area_composite,
    "probability_union":      _solve_probability_union,
    "roman_numeral":          _solve_roman_numeral,
    "temperature_conversion": _solve_temperature_conversion,
}

TASK_DESCRIPTIONS = {
    "percentage_discount":    "Percentage discount word problems",
    "km_to_miles":            "Kilometer-to-mile unit conversion",
    "last_n_index":           "Off-by-one list indexing puzzles",
    "compound_interest":      "Compound vs simple interest",
    "time_speed_distance":    "Time-speed-distance (unit conversion)",
    "binary_to_decimal":      "Binary-to-decimal conversion",
    "area_composite":         "Composite shape area (rectangle + semicircle)",
    "probability_union":      "Probability union P(A∪B)",
    "roman_numeral":          "Roman numeral to decimal",
    "temperature_conversion": "Fahrenheit to Celsius conversion",
}

LESSONS = {
    "percentage_discount": (
        "percent_as_flat_subtraction",
        "For percentage discount, convert the percent to a decimal (divide by 100) "
        "and multiply price by (1 - decimal). Do NOT subtract the percent number directly.",
    ),
    "km_to_miles": (
        "rounded_conversion_factor",
        "Always use the precise km-to-miles factor 0.621371, not rounded 0.6. "
        "Rounding compounds into a large error on longer distances.",
    ),
    "last_n_index": (
        "off_by_one_offset",
        "The k-th item from the end of a 1-based list of length N is at position N−(k−1), "
        "not N−k. The last item is k=1, which is an offset of zero.",
    ),
    "compound_interest": (
        "simple_vs_compound_interest",
        "Compound interest uses P×(1+r/100)^n, NOT the simple-interest formula P×(1+r×n/100). "
        "The exponent is the key difference.",
    ),
    "time_speed_distance": (
        "minutes_not_converted_to_hours",
        "When speed is in km/h and time is in minutes, divide time by 60 first: "
        "distance = speed × (minutes / 60).",
    ),
    "binary_to_decimal": (
        "bit_order_left_to_right",
        "Binary-to-decimal conversion reads bits right-to-left: the rightmost bit is 2^0. "
        "int('binary_string', 2) is the standard Python call.",
    ),
    "area_composite": (
        "semicircle_vs_full_circle",
        "A semicircle has area π×r²/2, NOT π×r². Always halve the circle area "
        "when the shape is a semicircle.",
    ),
    "probability_union": (
        "forgot_intersection_subtraction",
        "P(A∪B) = P(A) + P(B) − P(A∩B). Forgetting to subtract the intersection "
        "overcounts outcomes that belong to both events.",
    ),
    "roman_numeral": (
        "additive_only_roman",
        "Roman numerals use subtractive notation: when a smaller value appears before "
        "a larger one (e.g. IV, IX, XL), subtract it. A proper algorithm "
        "checks each symbol against the next.",
    ),
    "temperature_conversion": (
        "wrong_fahrenheit_order_of_ops",
        "Celsius = (Fahrenheit − 32) × 5/9. Subtract 32 FIRST, then multiply. "
        "Multiplying before subtracting gives a wrong result.",
    ),
}

CRITIQUES = {
    "percentage_discount": (
        "The submitted answer does not match price × (1 − discount/100); the discount "
        "percentage appears to have been subtracted directly as a flat dollar amount."
    ),
    "km_to_miles": (
        "The answer is off by more than the allowed tolerance, consistent with using "
        "a rounded conversion factor (~0.6) instead of the precise 0.621371."
    ),
    "last_n_index": (
        "The submitted position is one less than expected — a classic off-by-one error "
        "when counting positions from the end of a 1-based list."
    ),
    "compound_interest": (
        "The answer matches the simple-interest formula P×(1+r×n/100) rather than "
        "the compound formula P×(1+r/100)^n."
    ),
    "time_speed_distance": (
        "The answer appears to have used time in minutes directly as hours. "
        "Time must be converted: hours = minutes / 60."
    ),
    "binary_to_decimal": (
        "The answer corresponds to the binary string read in reverse (left-to-right) "
        "instead of the standard right-to-left (LSB-first) convention."
    ),
    "area_composite": (
        "The answer over-counts the circular part — it used the full-circle area π×r² "
        "instead of the semicircle area π×r²/2."
    ),
    "probability_union": (
        "The answer equals P(A) + P(B) without subtracting P(A∩B). "
        "The inclusion-exclusion principle requires subtracting the intersection."
    ),
    "roman_numeral": (
        "The answer is the additive sum of all symbol values. "
        "Subtractive pairs (IV=4, IX=9, XL=40 …) were ignored."
    ),
    "temperature_conversion": (
        "The answer corresponds to F×5/9 − 32 rather than (F−32)×5/9. "
        "The subtraction of 32 must happen before the multiplication."
    ),
}


def generate_task(task_type: str, rng: random.Random | None = None) -> Task:
    if task_type not in GENERATORS:
        raise ValueError(f"Unknown task type: {task_type}")
    return GENERATORS[task_type](rng or random.Random())
