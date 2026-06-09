from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
import json
import os

app = Flask(__name__)
CORS(app)

AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

client = boto3.client(
    service_name="bedrock-runtime",
    region_name=AWS_REGION,
    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY")
)

SYSTEM_PROMPT = """You are Marigold, a friendly and encouraging AI financial literacy coach for teens.
You help teens understand budgeting, credit, and predatory lending in a simple, fun, and supportive way.
Keep answers short and easy to understand.
Format your responses using markdown when it improves clarity: use bullet points (- item) or numbered lists (1. item) when listing multiple things, and bold (**text**) for key terms or important dollar amounts. Use line breaks between paragraphs. Do not use headers (##).
When the user clearly mentions a specific personal financial goal they want to achieve (saving for a specific item, paying off something, building credit, opening an account, etc.), add exactly this on a new line at the very end of your response: [GOAL: brief description under 60 chars]. Only include this tag when there is one specific, actionable goal — not for general advice.
When the user mentions spending or paying money on something specific (with a dollar amount), add exactly this on a new line at the very end of your response: [EXPENSE: amount|expense|brief description under 50 chars]. When the user mentions earning, receiving, or getting paid a specific dollar amount, add exactly this instead: [EXPENSE: amount|income|brief description under 50 chars]. Only include this tag when the user explicitly states a real transaction with a clear dollar amount — not for hypothetical examples or general advice. Do not include both a GOAL tag and an EXPENSE tag in the same response."""

LANGUAGE_INSTRUCTIONS = {
    "en": (
        "\n\nCRITICAL LANGUAGE RULE: You MUST respond entirely in English for every single message. "
        "This applies regardless of what language the previous messages in the conversation were written in — "
        "the chat history may be in Spanish or French but you must ALWAYS reply in English. "
        "Every word of your response must be in English. No Spanish or French words or phrases are allowed, "
        "except for the special detection tags [GOAL: ...] and [EXPENSE: ...] which must stay exactly as written."
    ),
    "es": (
        "\n\nCRITICAL LANGUAGE RULE: You MUST respond entirely in Spanish (Español) for every single message. "
        "This applies regardless of what language the previous messages in the conversation were written in — "
        "the chat history may be in English but you must ALWAYS reply in Spanish. "
        "Every word of your response must be in Spanish. No English words or phrases are allowed, "
        "except for the special detection tags [GOAL: ...] and [EXPENSE: ...] which must stay exactly as written."
    ),
    "fr": (
        "\n\nRÈGLE DE LANGUE CRITIQUE: Vous DEVEZ répondre entièrement en français pour chaque message. "
        "Cela s'applique quelle que soit la langue des messages précédents dans la conversation — "
        "l'historique du chat peut être en anglais mais vous devez TOUJOURS répondre en français. "
        "Chaque mot de votre réponse doit être en français. Aucun mot ou phrase en anglais n'est autorisé, "
        "sauf les balises de détection spéciales [GOAL: ...] et [EXPENSE: ...] qui doivent rester exactement telles quelles."
    )
}

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        messages = data.get("messages", [])
        lang = data.get("lang", "en")

        system = SYSTEM_PROMPT + LANGUAGE_INSTRUCTIONS.get(lang, "")

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 500,
            "system": system,
            "messages": messages
        })

        response = client.invoke_model(
            modelId="us.anthropic.claude-haiku-4-5-20251001-v1:0",
            body=body
        )

        response_body = json.loads(response["body"].read())
        reply = response_body["content"][0]["text"]

        return jsonify({"reply": reply})

    except Exception as e:
        return jsonify({"reply": f"Error: {str(e)}"}), 500

SCENARIO_PROMPT = """You are Marigold, a financial literacy coach for teens running an interactive scenario practice session.

Format your responses using markdown: use bullet points (- item) or numbered lists (1. item) when listing multiple things, and bold (**text**) for key terms or important dollar amounts. Use line breaks between paragraphs. Do not use headers (##).

When the user asks for a new scenario:
- Create a realistic, specific situation a teenager might actually face involving money
- Include exact dollar amounts to make it concrete
- End with a clear question asking what the teen would do
- Keep it to 3-5 sentences
- Do NOT number or label it — just present the situation naturally

When the user responds with their decision:
- Start by clearly saying whether the decision was **smart**, **risky**, or **could be improved**
- Explain the financial reasoning in plain language
- If the decision was not ideal, explain what a better choice would have been and why
- Give one concrete tip they can apply in real life
- Keep the tone encouraging — mistakes are how we learn
- End with an encouraging sentence (in your response language) inviting them to try another scenario using the New Scenario button or by asking

Keep all responses friendly, specific, and written for teenagers."""

@app.route("/scenario", methods=["POST"])
def scenario():
    try:
        data = request.get_json()
        messages = data.get("messages", [])
        lang = data.get("lang", "en")

        scenario_system = SCENARIO_PROMPT + LANGUAGE_INSTRUCTIONS.get(lang, "")

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 600,
            "system": scenario_system,
            "messages": messages
        })

        response = client.invoke_model(
            modelId="us.anthropic.claude-haiku-4-5-20251001-v1:0",
            body=body
        )

        response_body = json.loads(response["body"].read())
        reply = response_body["content"][0]["text"]

        return jsonify({"reply": reply})

    except Exception as e:
        return jsonify({"reply": f"Error: {str(e)}"}), 500

QUIZ_GEN_PROMPT = """You are a financial literacy quiz generator for teenagers.
Generate quiz questions for high school students about personal finance.
Return ONLY a valid JSON array — no explanation, no markdown, no extra text.

Each question must be exactly one of these two formats:
Multiple choice: {"type":"mc","question":"...","options":["...","...","...","..."],"correct":0,"explanation":"..."}
  - "correct" is the 0-based index of the right answer
  - "explanation" is 1-2 sentences explaining why that answer is correct
Free response: {"type":"fr","question":"..."}

Mix the types: roughly 70% multiple choice, 30% free response.
Keep questions grounded in real situations teens actually face with money."""

@app.route("/quiz/generate", methods=["POST"])
def quiz_generate():
    try:
        data = request.get_json()
        topic = data.get("topic", "general financial literacy")
        count = int(data.get("count", 5))

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2000,
            "system": QUIZ_GEN_PROMPT,
            "messages": [{"role": "user", "content": f"Generate exactly {count} quiz questions about {topic} for high school students."}]
        })

        response = client.invoke_model(
            modelId="us.anthropic.claude-haiku-4-5-20251001-v1:0",
            body=body
        )

        raw = json.loads(response["body"].read())["content"][0]["text"].strip()
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start == -1 or end == 0:
            return jsonify({"error": "Invalid AI response"}), 500

        questions = json.loads(raw[start:end])
        return jsonify({"questions": questions})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


TIMED_GEN_PROMPT = """You are generating rapid-fire multiple choice questions for a timed financial literacy quiz for teenagers.
Questions must be SHORT enough to read and answer in a few seconds.

Return ONLY a valid JSON array — no markdown, no extra text:
[{"question": "...", "options": ["...", "...", "...", "..."], "correct": 0}]

Difficulty guidelines:
- easy: direct definitions, obvious context, very clear correct answer
- medium: requires understanding not just memorization, believable distractors
- hard: tricky similar-sounding options, edge cases, requires solid knowledge

All questions must follow these rules:
- Question text under 15 words
- Each option under 7 words
- No obscure jargon — teens must recognize the topic immediately
- correct is the 0-based index of the right answer
- Vary which position (0,1,2,3) holds the correct answer across questions"""

@app.route("/timed/generate", methods=["POST"])
def timed_generate():
    try:
        data       = request.get_json()
        topic      = data.get("topic", "general financial literacy")
        count      = int(data.get("count", 5))
        difficulty = data.get("difficulty", "easy")

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1500,
            "system": TIMED_GEN_PROMPT,
            "messages": [{"role": "user", "content":
                f"Generate exactly {count} {difficulty}-difficulty rapid-fire questions about {topic} for high school students."}]
        })

        response = client.invoke_model(
            modelId="us.anthropic.claude-haiku-4-5-20251001-v1:0",
            body=body
        )

        raw   = json.loads(response["body"].read())["content"][0]["text"].strip()
        start = raw.find("[")
        end   = raw.rfind("]") + 1
        if start == -1 or end == 0:
            return jsonify({"error": "Invalid AI response"}), 500

        questions = json.loads(raw[start:end])
        return jsonify({"questions": questions})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


SPOTMISTAKE_GEN_PROMPT = """You are generating "spot the financial mistake" scenarios for a teenager.

Return ONLY valid JSON — no markdown, no extra text:
{
  "scenarios": [
    {
      "story": "A realistic 3-5 sentence scenario about a teen making financial decisions. Contains exactly ONE financial mistake that a careful reader could identify.",
      "mistake": "A clear 1-2 sentence explanation of what the financial mistake was and why it's a problem."
    }
  ]
}

Rules:
- Each scenario contains exactly ONE financial mistake
- Make the mistake realistic but not embarrassingly obvious — the reader should have to think
- Use specific dollar amounts and real-teen situations (jobs, purchases, savings, credit, etc.)
- Write the story naturally and in third person
- The mistake explanation should be educational, not just a restatement of what went wrong"""

@app.route("/spotmistake/generate", methods=["POST"])
def spotmistake_generate():
    try:
        data  = request.get_json()
        topic = data.get("topic", "general financial literacy")
        count = int(data.get("count", 5))

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2500,
            "system": SPOTMISTAKE_GEN_PROMPT,
            "messages": [{"role": "user", "content": f"Generate exactly {count} spot-the-mistake scenarios about {topic} for high school students."}]
        })

        response = client.invoke_model(
            modelId="us.anthropic.claude-haiku-4-5-20251001-v1:0",
            body=body
        )

        raw   = json.loads(response["body"].read())["content"][0]["text"].strip()
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start == -1 or end == 0:
            return jsonify({"error": "Invalid AI response"}), 500

        result = json.loads(raw[start:end])
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


SPOTMISTAKE_GRADE_PROMPT = """You are grading a teenager's answers on a "spot the financial mistake" quiz.
Each item has a scenario story, the actual financial mistake in that story, and the student's answer.

Return ONLY a valid JSON array (no markdown, no extra text), one object per item, in the same order:
[{"score": 0-2, "found": true/false, "feedback": "1-2 encouraging sentences"}]

Scoring:
- score 2: student correctly identified the key financial mistake
- score 1: student partially identified it or was on the right track but missed specifics
- score 0: student missed the mistake entirely or identified something that wasn't the main issue

"found" should be true if score >= 2, false otherwise.
Always reveal what the actual mistake was in the feedback so the student learns."""

@app.route("/spotmistake/grade", methods=["POST"])
def spotmistake_grade():
    try:
        data  = request.get_json()
        items = data.get("items", [])  # [{story, mistake, userAnswer}]

        content = "Grade these spot-the-mistake answers:\n\n"
        for i, item in enumerate(items, 1):
            content += (
                f"{i}. Story: {item['story']}\n"
                f"   Actual mistake: {item['mistake']}\n"
                f"   Student's answer: {item.get('userAnswer') or '(blank)'}\n\n"
            )

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1200,
            "system": SPOTMISTAKE_GRADE_PROMPT,
            "messages": [{"role": "user", "content": content}]
        })

        response = client.invoke_model(
            modelId="us.anthropic.claude-haiku-4-5-20251001-v1:0",
            body=body
        )

        raw    = json.loads(response["body"].read())["content"][0]["text"].strip()
        start  = raw.find("[")
        end    = raw.rfind("]") + 1
        grades = json.loads(raw[start:end])
        return jsonify({"grades": grades})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


DRAGDROP_PROMPT = """You are generating financial literacy vocabulary for teenagers.

Return ONLY valid JSON — no markdown, no extra text:
{
  "pairs": [
    { "term": "Term (1-4 words max)", "definition": "Clear, accurate definition in 1-2 sentences for a high schooler." }
  ]
}

Rules:
- Terms must be 1-4 words
- Definitions must be accurate and easy to understand
- No two definitions should be so similar they are confusing
- Vary definition length slightly so not all cards are the same height
- Focus on vocabulary teens will actually encounter with money"""

@app.route("/dragdrop/generate", methods=["POST"])
def dragdrop_generate():
    try:
        data  = request.get_json()
        topic = data.get("topic", "general financial literacy")
        count = int(data.get("count", 6))

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1500,
            "system": DRAGDROP_PROMPT,
            "messages": [{"role": "user", "content": f"Generate exactly {count} vocabulary term-definition pairs about {topic} for high school students."}]
        })

        response = client.invoke_model(
            modelId="us.anthropic.claude-haiku-4-5-20251001-v1:0",
            body=body
        )

        raw   = json.loads(response["body"].read())["content"][0]["text"].strip()
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start == -1 or end == 0:
            return jsonify({"error": "Invalid AI response"}), 500

        result = json.loads(raw[start:end])
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


CHALLENGE_PROMPT = """You are writing a choose-your-path financial literacy story for a teenager.

Return ONLY valid JSON — no markdown, no extra text — matching this structure exactly:
{
  "title": "Short engaging story title",
  "intro": "2-3 sentences introducing the teen character and their financial situation",
  "chapters": [
    {
      "situation": "2-3 sentences describing what is happening and the financial decision to be made",
      "choices": [
        { "text": "What the teen decides to do (1 sentence)", "consequence": "What happens as a result (1-2 sentences)", "score": 2 },
        { "text": "...", "consequence": "...", "score": 0 },
        { "text": "...", "consequence": "...", "score": 1 }
      ]
    }
  ],
  "outcome_excellent": "2-3 sentences describing a positive financial future for score >= 80%",
  "outcome_good": "2-3 sentences for score 50-79%",
  "outcome_poor": "2-3 sentences describing consequences of poor choices for score < 50%"
}

Rules:
- Exactly 3 choices per chapter, listed in any order (do NOT always put the best choice first)
- score 2 = smart financial move, score 1 = acceptable but not optimal, score 0 = financially harmful
- Include specific dollar amounts to make decisions concrete and realistic for teens
- Each chapter should feel like a natural progression of the same story
- Keep the tone engaging and relatable for teens aged 13-18"""

@app.route("/challenge/generate", methods=["POST"])
def challenge_generate():
    try:
        data = request.get_json()
        topic = data.get("topic", "general financial literacy")
        count = int(data.get("count", 5))

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 3000,
            "system": CHALLENGE_PROMPT,
            "messages": [{"role": "user", "content": f"Generate a {count}-chapter choose-your-path story about {topic} for a high school student."}]
        })

        response = client.invoke_model(
            modelId="us.anthropic.claude-haiku-4-5-20251001-v1:0",
            body=body
        )

        raw = json.loads(response["body"].read())["content"][0]["text"].strip()
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start == -1 or end == 0:
            return jsonify({"error": "Invalid AI response"}), 500

        story = json.loads(raw[start:end])
        return jsonify({"story": story})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


QUIZ_GRADE_PROMPT = """You are grading free response answers on a financial literacy quiz taken by a teenager.
You will receive a numbered list of question/answer pairs.
Return ONLY a valid JSON array (no markdown, no extra text) with one object per pair in the same order:
[{"score": 0, "feedback": "..."}, ...]
Scoring guide: 0 = incorrect or blank, 1 = partially correct, 2 = fully correct and well-explained.
Keep each feedback entry encouraging, specific, and educational — 1-2 sentences max."""

@app.route("/quiz/grade", methods=["POST"])
def quiz_grade():
    try:
        data = request.get_json()
        pairs = data.get("pairs", [])

        content = "Grade these answers:\n\n"
        for i, p in enumerate(pairs, 1):
            content += f"{i}. Question: {p['question']}\n   Answer: {p.get('answer') or '(blank)'}\n\n"

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "system": QUIZ_GRADE_PROMPT,
            "messages": [{"role": "user", "content": content}]
        })

        response = client.invoke_model(
            modelId="us.anthropic.claude-haiku-4-5-20251001-v1:0",
            body=body
        )

        raw = json.loads(response["body"].read())["content"][0]["text"].strip()
        start = raw.find("[")
        end = raw.rfind("]") + 1
        grades = json.loads(raw[start:end])
        return jsonify({"grades": grades})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=False, host="0.0.0.0", port=port)
