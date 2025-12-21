use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::error::Error;

const ANTHROPIC_API_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";
const CLAUDE_MODEL: &str = "claude-sonnet-4-20250514";

#[derive(Debug, Serialize, Clone)]
pub struct AnthropicMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
struct MessagesRequest {
    model: String,
    max_tokens: u32,
    system: Option<String>,
    messages: Vec<AnthropicMessage>,
    temperature: Option<f32>,
}

#[derive(Debug, Deserialize)]
struct MessagesResponse {
    content: Vec<ContentBlock>,
}

#[derive(Debug, Deserialize)]
struct ContentBlock {
    #[serde(rename = "type")]
    content_type: String,
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AnthropicError {
    error: ErrorDetails,
}

#[derive(Debug, Deserialize)]
struct ErrorDetails {
    message: String,
    #[serde(rename = "type")]
    error_type: String,
}

pub struct AnthropicClient {
    client: Client,
    api_key: String,
}

impl AnthropicClient {
    pub fn new(api_key: &str) -> Self {
        Self {
            client: Client::new(),
            api_key: api_key.to_string(),
        }
    }
    
    /// Send a chat completion request to Claude
    /// 
    /// Messages should be in alternating user/assistant format.
    /// The system message should be passed separately.
    pub async fn chat_completion(
        &self,
        system_prompt: Option<&str>,
        messages: Vec<AnthropicMessage>,
        temperature: f32,
        max_tokens: Option<u32>,
    ) -> Result<String, Box<dyn Error + Send + Sync>> {
        let request = MessagesRequest {
            model: CLAUDE_MODEL.to_string(),
            max_tokens: max_tokens.unwrap_or(2048),
            system: system_prompt.map(|s| s.to_string()),
            messages,
            temperature: Some(temperature),
        };
        
        let response = self.client
            .post(ANTHROPIC_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;
        
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await?;
            
            // Try to parse structured error
            if let Ok(parsed_error) = serde_json::from_str::<AnthropicError>(&error_text) {
                return Err(format!(
                    "Anthropic API error ({}): {} - {}",
                    status, parsed_error.error.error_type, parsed_error.error.message
                ).into());
            }
            
            return Err(format!("Anthropic API error ({}): {}", status, error_text).into());
        }
        
        let completion: MessagesResponse = response.json().await?;
        
        // Extract text from content blocks
        completion.content
            .iter()
            .find(|c| c.content_type == "text")
            .and_then(|c| c.text.clone())
            .ok_or_else(|| "No text response from Claude".into())
    }
    
    /// Validate the Anthropic API key
    pub async fn validate_api_key(&self) -> Result<bool, Box<dyn Error + Send + Sync>> {
        let messages = vec![AnthropicMessage {
            role: "user".to_string(),
            content: "Say 'ok'".to_string(),
        }];
        
        let request = MessagesRequest {
            model: CLAUDE_MODEL.to_string(),
            max_tokens: 10,
            system: None,
            messages,
            temperature: Some(0.0),
        };
        
        let response = self.client
            .post(ANTHROPIC_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;
        
        if response.status().is_success() {
            Ok(true)
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            
            if status.as_u16() == 401 {
                return Err("Invalid Anthropic API key".into());
            } else if status.as_u16() == 429 {
                return Err("Rate limited - too many requests".into());
            }
            
            // Try to parse structured error for better messaging
            if let Ok(parsed_error) = serde_json::from_str::<AnthropicError>(&error_text) {
                return Err(format!("{}: {}", parsed_error.error.error_type, parsed_error.error.message).into());
            }
            
            Err(format!("Anthropic API error ({}): {}", status, error_text).into())
        }
    }
}

/// Helper to convert OpenAI-style messages to Anthropic format
/// Extracts system message and returns (system_prompt, messages)
pub fn convert_messages(messages: Vec<crate::openai::ChatMessage>) -> (Option<String>, Vec<AnthropicMessage>) {
    let mut system_prompt = None;
    let mut anthropic_messages = Vec::new();
    
    for msg in messages {
        if msg.role == "system" {
            // Accumulate system messages
            if let Some(existing) = system_prompt {
                system_prompt = Some(format!("{}\n\n{}", existing, msg.content));
            } else {
                system_prompt = Some(msg.content);
            }
        } else {
            anthropic_messages.push(AnthropicMessage {
                role: msg.role,
                content: msg.content,
            });
        }
    }
    
    (system_prompt, anthropic_messages)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_convert_messages() {
        let messages = vec![
            crate::openai::ChatMessage {
                role: "system".to_string(),
                content: "You are helpful.".to_string(),
            },
            crate::openai::ChatMessage {
                role: "user".to_string(),
                content: "Hello".to_string(),
            },
        ];
        
        let (system, msgs) = convert_messages(messages);
        
        assert_eq!(system, Some("You are helpful.".to_string()));
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].role, "user");
        assert_eq!(msgs[0].content, "Hello");
    }
}

