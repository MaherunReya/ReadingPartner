"""Plan limits in one place. Change the numbers here and the whole app follows.

Cost maths (Gemini Flash; re-check Google's pricing page before you set prices):
  one flashcard generation ~ $0.012   (about 4k tokens in, 800 out for 10 cards; a full 8,000-word source is ~11k tokens in, roughly $0.03)

What a customer is actually charged comes from the Price you create in the Stripe
dashboard (its ID goes in STRIPE_PRICE_ID). `price` / `currency` below are only for
display on the billing page, so keep them in sync with that Price.
"""

PLANS = {
    "free": {
        "id": "free",
        "name": "Free",
        "price": 0,
        "currency": "USD",
        "flashcards_per_month": 3,
        "max_cards": 10,
        "max_notes_words": 8000,
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "price": 4,  # must match your Stripe Price
        "currency": "USD",
        "flashcards_per_month": 30,
        "max_cards": 30,
        "max_notes_words": 8000,
    },
}
