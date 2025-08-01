# SDR Email Sequence Generator

This project is a FastAPI-based backend service for generating professional cold outreach email sequences using Azure OpenAI. It is designed to help sales development representatives (SDRs) automate the creation of initial outreach emails, follow-ups, and replies based on recipient responses.

## Features

- **Initial Email Generation**: Creates a subject and body for the first outreach email in a specified style and topic.
- **Follow-Up Emails**: Generates up to three follow-up emails, each referencing the previous email for context.
- **Reply Templates**: Provides responses for three scenarios: recipient is interested, not interested, or requests a meeting.
- **Customizable Style**: Allows users to specify the style and description for the email sequence.
- **Robust Validation**: Uses Pydantic models to ensure correct structure and validation of email content.
- **Azure OpenAI Integration**: Utilizes Azure OpenAI's GPT-4 deployment for high-quality email generation.

## Project Structure

```
studio.py         # Main FastAPI application and email generation logic
__pycache__/      # Python cache files
```

## How It Works

1. **Environment Setup**: Loads environment variables from `.env`, including the Azure OpenAI API key.
2. **API Endpoint**: Exposes a POST endpoint `/generate_email_sequence` that accepts a style and description.
3. **Email Generation**: Orchestrates calls to Azure OpenAI to generate the initial email, follow-ups, and replies.
4. **Validation**: Ensures the correct number of follow-ups and proper structure using Pydantic models.
5. **Response**: Returns a structured JSON response containing the full email sequence.

## API Usage

### Endpoint

`POST /generate_email_sequence`

#### Request Body

```json
{
  "style_name": "Friendly",
  "description": "Introducing our new analytics platform for SMBs"
}
```

#### Response

```json
{
  "initial_email": { "subject": "...", "body": "..." },
  "follow_up": {
    "count": 2,
    "follow_up_1": { "subject": "...", "body": "..." },
    "follow_up_2": { "subject": "...", "body": "..." }
  },
  "reply_interested": { "subject": "...", "body": "..." },
  "reply_not_interested": { "subject": "...", "body": "..." },
  "reply_meeting_requested": { "subject": "...", "body": "..." }
}
```

## Environment Variables

Create a `.env` file in the project directory with the following:

```
AZURE_OPENAI_KEY=your_azure_openai_key_here
```

## Setup & Run

1. **Install dependencies**:
   ```powershell
   pip install fastapi uvicorn python-dotenv openai
   ```
2. **Set up `.env`** with your Azure OpenAI key.
3. **Start the server**:
   ```powershell
   uvicorn studio:app --reload
   ```
4. **Test the API** using tools like [Postman](https://www.postman.com/) or [curl](https://curl.se/).

## Code Overview

- **studio.py**: Contains all logic for email generation, validation, and API endpoint.
  - `EmailContent`, `FollowUpEmails`, `EmailSequence`, `StyleRequest`: Pydantic models for request/response validation.
  - `generate_initial_email`, `generate_follow_ups`, `generate_reply`: Async functions to interact with Azure OpenAI and generate emails.
  - `build_email_sequence`: Orchestrates the full sequence generation.
  - `extract_json_string`: Utility to clean and parse JSON from model responses.
  - `get_chat_response`: Wrapper for Azure OpenAI chat completions.
  - FastAPI app and endpoint definition.

## Error Handling

- Returns HTTP 500 with error details if email generation fails or required environment variables are missing.
- Validates follow-up count and structure using Pydantic.

## Extending the Project

- Add more reply scenarios by extending the `prompt_map` in `generate_reply`.
- Integrate with frontend or CRM systems for automated outreach.
- Customize prompt engineering for different industries or use cases.

## License

This project is provided as-is for educational and internal business use. Please review and comply with Azure OpenAI and FastAPI licensing terms.

---

**Author:** BasalAnalytics SDR Team
