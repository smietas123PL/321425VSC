# Observability Event Schema (v1.1.0)

## Standard Fields
- `event`
- `timestamp`
- `app_version`
- `provider`
- `screen`
- `success`

## Core Events
1. `app_loaded`
2. `team_generated`
3. `export_zip`
4. `share_created`
5. `share_loaded`
6. `runtime_error`

## Privacy Guardrails
- Do not send API keys.
- Do not send full prompts or generated file contents.
- Keep error messages truncated.
