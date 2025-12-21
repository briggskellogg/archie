use chrono::Utc;
use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use tauri::Manager;

// Database connection singleton
static DB: Lazy<Mutex<Option<Connection>>> = Lazy::new(|| Mutex::new(None));

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserProfile {
    pub id: i64,
    pub api_key: Option<String>,
    pub anthropic_key: Option<String>,
    pub instinct_weight: f64,
    pub logic_weight: f64,
    pub psyche_weight: f64,
    pub total_messages: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Conversation {
    pub id: String,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub response_type: Option<String>,
    pub references_message_id: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserContext {
    pub id: i64,
    pub key: String,
    pub value: String,
    pub confidence: f64,
    pub source_agent: Option<String>,
    pub updated_at: String,
}

// ============ Memory System Structs ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserFact {
    pub id: i64,
    pub category: String,           // "personal", "preferences", "work", "relationships", "values"
    pub key: String,
    pub value: String,
    pub confidence: f64,            // 1.0 for explicit, lower for inferred
    pub source_type: String,        // "explicit" or "inferred"
    pub source_conversation_id: Option<String>,
    pub first_mentioned: String,
    pub last_confirmed: String,
    pub mention_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserPattern {
    pub id: i64,
    pub pattern_type: String,       // "communication_style", "emotional_tendency", "thinking_mode", "recurring_theme"
    pub description: String,
    pub confidence: f64,
    pub evidence: String,           // JSON array of supporting observations
    pub first_observed: String,
    pub last_updated: String,
    pub observation_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversationSummary {
    pub id: i64,
    pub conversation_id: String,
    pub summary: String,
    pub key_topics: String,         // JSON array
    pub emotional_tone: Option<String>,
    pub user_state: Option<String>,
    pub agents_involved: String,    // JSON array
    pub message_count: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecurringTheme {
    pub id: i64,
    pub theme: String,
    pub frequency: i64,
    pub last_mentioned: String,
    pub related_conversations: Option<String>, // JSON array of conversation IDs
}

fn get_db_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let app_data_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");
    app_data_dir.join("intersect.db")
}

pub fn init_database(app_handle: &tauri::AppHandle) -> Result<()> {
    let db_path = get_db_path(app_handle);
    let conn = Connection::open(&db_path)?;
    
    // Create tables
    conn.execute_batch(
        "
        -- User profile with evolving weights
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY,
            api_key TEXT,
            anthropic_key TEXT,
            instinct_weight REAL DEFAULT 0.33,
            logic_weight REAL DEFAULT 0.33,
            psyche_weight REAL DEFAULT 0.34,
            total_messages INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        -- Conversation sessions
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT,
            summary TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        -- Messages with agent attribution
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            response_type TEXT,
            references_message_id TEXT,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        );

        -- Learned user context (legacy, kept for compatibility)
        CREATE TABLE IF NOT EXISTS user_context (
            id INTEGER PRIMARY KEY,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            confidence REAL DEFAULT 0.5,
            source_agent TEXT,
            updated_at TEXT NOT NULL
        );

        -- User facts (explicit statements about the user)
        CREATE TABLE IF NOT EXISTS user_facts (
            id INTEGER PRIMARY KEY,
            category TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            confidence REAL DEFAULT 1.0,
            source_type TEXT NOT NULL,
            source_conversation_id TEXT,
            first_mentioned TEXT NOT NULL,
            last_confirmed TEXT NOT NULL,
            mention_count INTEGER DEFAULT 1,
            UNIQUE(category, key)
        );

        -- Inferred patterns (behavioral/personality observations)
        CREATE TABLE IF NOT EXISTS user_patterns (
            id INTEGER PRIMARY KEY,
            pattern_type TEXT NOT NULL,
            description TEXT NOT NULL,
            confidence REAL DEFAULT 0.5,
            evidence TEXT NOT NULL,
            first_observed TEXT NOT NULL,
            last_updated TEXT NOT NULL,
            observation_count INTEGER DEFAULT 1
        );

        -- Conversation summaries (token-efficient history)
        CREATE TABLE IF NOT EXISTS conversation_summaries (
            id INTEGER PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            summary TEXT NOT NULL,
            key_topics TEXT NOT NULL,
            emotional_tone TEXT,
            user_state TEXT,
            agents_involved TEXT NOT NULL,
            message_count INTEGER,
            created_at TEXT NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        );

        -- Cross-conversation recurring themes
        CREATE TABLE IF NOT EXISTS recurring_themes (
            id INTEGER PRIMARY KEY,
            theme TEXT NOT NULL UNIQUE,
            frequency INTEGER DEFAULT 1,
            last_mentioned TEXT NOT NULL,
            related_conversations TEXT
        );
        "
    )?;
    
    // Migration: Add anthropic_key column if it doesn't exist
    let has_anthropic_key: bool = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('user_profile') WHERE name='anthropic_key'",
        [],
        |row| Ok(row.get::<_, i64>(0)? > 0)
    ).unwrap_or(false);
    
    if !has_anthropic_key {
        let _ = conn.execute("ALTER TABLE user_profile ADD COLUMN anthropic_key TEXT", []);
    }
    
    // Ensure a user profile exists
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM user_profile",
        [],
        |row| row.get(0)
    )?;
    
    if count == 0 {
        let now = Utc::now().to_rfc3339();
        // Default weights: Logic 50%, Psyche 30%, Instinct 20%
        conn.execute(
            "INSERT INTO user_profile (api_key, instinct_weight, logic_weight, psyche_weight, total_messages, created_at, updated_at)
             VALUES (NULL, 0.20, 0.50, 0.30, 0, ?1, ?2)",
            params![now, now]
        )?;
    }
    
    let mut db = DB.lock().unwrap();
    *db = Some(conn);
    
    Ok(())
}

fn with_connection<F, T>(f: F) -> Result<T>
where
    F: FnOnce(&Connection) -> Result<T>,
{
    let db = DB.lock().unwrap();
    let conn = db.as_ref().expect("Database not initialized");
    f(conn)
}

// ============ User Profile ============

pub fn get_user_profile() -> Result<UserProfile> {
    with_connection(|conn| {
        conn.query_row(
            "SELECT id, api_key, anthropic_key, instinct_weight, logic_weight, psyche_weight, total_messages, created_at, updated_at
             FROM user_profile LIMIT 1",
            [],
            |row| {
                Ok(UserProfile {
                    id: row.get(0)?,
                    api_key: row.get(1)?,
                    anthropic_key: row.get(2)?,
                    instinct_weight: row.get(3)?,
                    logic_weight: row.get(4)?,
                    psyche_weight: row.get(5)?,
                    total_messages: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            }
        )
    })
}

pub fn update_api_key(api_key: &str) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    with_connection(|conn| {
        conn.execute(
            "UPDATE user_profile SET api_key = ?1, updated_at = ?2",
            params![api_key, now]
        )?;
        Ok(())
    })
}

pub fn clear_api_key() -> Result<()> {
    let now = Utc::now().to_rfc3339();
    with_connection(|conn| {
        conn.execute(
            "UPDATE user_profile SET api_key = NULL, updated_at = ?1",
            params![now]
        )?;
        Ok(())
    })
}

pub fn update_anthropic_key(api_key: &str) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    with_connection(|conn| {
        conn.execute(
            "UPDATE user_profile SET anthropic_key = ?1, updated_at = ?2",
            params![api_key, now]
        )?;
        Ok(())
    })
}

pub fn clear_anthropic_key() -> Result<()> {
    let now = Utc::now().to_rfc3339();
    with_connection(|conn| {
        conn.execute(
            "UPDATE user_profile SET anthropic_key = NULL, updated_at = ?1",
            params![now]
        )?;
        Ok(())
    })
}

pub fn update_weights(instinct: f64, logic: f64, psyche: f64) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    with_connection(|conn| {
        conn.execute(
            "UPDATE user_profile SET instinct_weight = ?1, logic_weight = ?2, psyche_weight = ?3, updated_at = ?4",
            params![instinct, logic, psyche, now]
        )?;
        Ok(())
    })
}

pub fn increment_message_count() -> Result<()> {
    let now = Utc::now().to_rfc3339();
    with_connection(|conn| {
        conn.execute(
            "UPDATE user_profile SET total_messages = total_messages + 1, updated_at = ?1",
            params![now]
        )?;
        Ok(())
    })
}

// ============ Conversations ============

pub fn create_conversation(id: &str) -> Result<Conversation> {
    let now = Utc::now().to_rfc3339();
    with_connection(|conn| {
        conn.execute(
            "INSERT INTO conversations (id, title, summary, created_at, updated_at)
             VALUES (?1, NULL, NULL, ?2, ?3)",
            params![id, now, now]
        )?;
        Ok(Conversation {
            id: id.to_string(),
            title: None,
            summary: None,
            created_at: now.clone(),
            updated_at: now,
        })
    })
}

pub fn get_conversation(id: &str) -> Result<Option<Conversation>> {
    with_connection(|conn| {
        let result = conn.query_row(
            "SELECT id, title, summary, created_at, updated_at FROM conversations WHERE id = ?1",
            params![id],
            |row| {
                Ok(Conversation {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    summary: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            }
        );
        match result {
            Ok(conv) => Ok(Some(conv)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    })
}

pub fn get_recent_conversations(limit: usize) -> Result<Vec<Conversation>> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, title, summary, created_at, updated_at 
             FROM conversations 
             ORDER BY updated_at DESC 
             LIMIT ?1"
        )?;
        
        let convs = stmt.query_map([limit], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                summary: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?;
        
        convs.collect()
    })
}

pub fn update_conversation_title(id: &str, title: &str) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    with_connection(|conn| {
        conn.execute(
            "UPDATE conversations SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![title, now, id]
        )?;
        Ok(())
    })
}

// ============ Messages ============

pub fn save_message(message: &Message) -> Result<()> {
    with_connection(|conn| {
        conn.execute(
            "INSERT OR REPLACE INTO messages (id, conversation_id, role, content, response_type, references_message_id, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                message.id,
                message.conversation_id,
                message.role,
                message.content,
                message.response_type,
                message.references_message_id,
                message.timestamp
            ]
        )?;
        
        // Update conversation timestamp
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE conversations SET updated_at = ?1 WHERE id = ?2",
            params![now, message.conversation_id]
        )?;
        
        Ok(())
    })
}

pub fn get_conversation_messages(conversation_id: &str) -> Result<Vec<Message>> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, conversation_id, role, content, response_type, references_message_id, timestamp 
             FROM messages 
             WHERE conversation_id = ?1 
             ORDER BY timestamp ASC"
        )?;
        
        let messages = stmt.query_map([conversation_id], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                response_type: row.get(4)?,
                references_message_id: row.get(5)?,
                timestamp: row.get(6)?,
            })
        })?;
        
        messages.collect()
    })
}

pub fn get_recent_messages(conversation_id: &str, limit: usize) -> Result<Vec<Message>> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, conversation_id, role, content, response_type, references_message_id, timestamp 
             FROM messages 
             WHERE conversation_id = ?1 
             ORDER BY timestamp DESC 
             LIMIT ?2"
        )?;
        
        let messages = stmt.query_map(params![conversation_id, limit], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                response_type: row.get(4)?,
                references_message_id: row.get(5)?,
                timestamp: row.get(6)?,
            })
        })?;
        
        let mut result: Vec<Message> = messages.collect::<Result<Vec<_>>>()?;
        result.reverse();
        Ok(result)
    })
}

pub fn clear_conversation_messages(conversation_id: &str) -> Result<()> {
    with_connection(|conn| {
        conn.execute("DELETE FROM messages WHERE conversation_id = ?1", params![conversation_id])?;
        Ok(())
    })
}

// ============ User Context ============

pub fn save_user_context(key: &str, value: &str, confidence: f64, source_agent: Option<&str>) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    with_connection(|conn| {
        conn.execute(
            "INSERT OR REPLACE INTO user_context (key, value, confidence, source_agent, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![key, value, confidence, source_agent, now]
        )?;
        Ok(())
    })
}

pub fn get_all_user_context() -> Result<Vec<UserContext>> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, key, value, confidence, source_agent, updated_at FROM user_context ORDER BY confidence DESC"
        )?;
        
        let contexts = stmt.query_map([], |row| {
            Ok(UserContext {
                id: row.get(0)?,
                key: row.get(1)?,
                value: row.get(2)?,
                confidence: row.get(3)?,
                source_agent: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;
        
        contexts.collect()
    })
}

pub fn clear_user_context() -> Result<()> {
    with_connection(|conn| {
        conn.execute("DELETE FROM user_context", [])?;
        Ok(())
    })
}

// ============ User Facts ============

pub fn save_user_fact(fact: &UserFact) -> Result<()> {
    with_connection(|conn| {
        conn.execute(
            "INSERT INTO user_facts (category, key, value, confidence, source_type, source_conversation_id, first_mentioned, last_confirmed, mention_count)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(category, key) DO UPDATE SET
                value = ?3,
                confidence = MAX(confidence, ?4),
                last_confirmed = ?8,
                mention_count = mention_count + 1",
            params![
                fact.category,
                fact.key,
                fact.value,
                fact.confidence,
                fact.source_type,
                fact.source_conversation_id,
                fact.first_mentioned,
                fact.last_confirmed,
                fact.mention_count
            ]
        )?;
        Ok(())
    })
}

pub fn get_all_user_facts() -> Result<Vec<UserFact>> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, category, key, value, confidence, source_type, source_conversation_id, first_mentioned, last_confirmed, mention_count
             FROM user_facts ORDER BY confidence DESC, mention_count DESC"
        )?;
        
        let facts = stmt.query_map([], |row| {
            Ok(UserFact {
                id: row.get(0)?,
                category: row.get(1)?,
                key: row.get(2)?,
                value: row.get(3)?,
                confidence: row.get(4)?,
                source_type: row.get(5)?,
                source_conversation_id: row.get(6)?,
                first_mentioned: row.get(7)?,
                last_confirmed: row.get(8)?,
                mention_count: row.get(9)?,
            })
        })?;
        
        facts.collect()
    })
}

pub fn get_user_facts_by_category(category: &str) -> Result<Vec<UserFact>> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, category, key, value, confidence, source_type, source_conversation_id, first_mentioned, last_confirmed, mention_count
             FROM user_facts WHERE category = ?1 ORDER BY confidence DESC"
        )?;
        
        let facts = stmt.query_map([category], |row| {
            Ok(UserFact {
                id: row.get(0)?,
                category: row.get(1)?,
                key: row.get(2)?,
                value: row.get(3)?,
                confidence: row.get(4)?,
                source_type: row.get(5)?,
                source_conversation_id: row.get(6)?,
                first_mentioned: row.get(7)?,
                last_confirmed: row.get(8)?,
                mention_count: row.get(9)?,
            })
        })?;
        
        facts.collect()
    })
}

pub fn get_high_confidence_facts(min_confidence: f64) -> Result<Vec<UserFact>> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, category, key, value, confidence, source_type, source_conversation_id, first_mentioned, last_confirmed, mention_count
             FROM user_facts WHERE confidence >= ?1 ORDER BY confidence DESC"
        )?;
        
        let facts = stmt.query_map([min_confidence], |row| {
            Ok(UserFact {
                id: row.get(0)?,
                category: row.get(1)?,
                key: row.get(2)?,
                value: row.get(3)?,
                confidence: row.get(4)?,
                source_type: row.get(5)?,
                source_conversation_id: row.get(6)?,
                first_mentioned: row.get(7)?,
                last_confirmed: row.get(8)?,
                mention_count: row.get(9)?,
            })
        })?;
        
        facts.collect()
    })
}

// ============ User Patterns ============

pub fn save_user_pattern(pattern: &UserPattern) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    with_connection(|conn| {
        // Check if pattern with same type and similar description exists
        let existing: Option<i64> = conn.query_row(
            "SELECT id FROM user_patterns WHERE pattern_type = ?1 AND description = ?2",
            params![pattern.pattern_type, pattern.description],
            |row| row.get(0)
        ).ok();
        
        if let Some(id) = existing {
            // Update existing pattern
            conn.execute(
                "UPDATE user_patterns SET confidence = MIN(1.0, confidence + 0.1), observation_count = observation_count + 1, last_updated = ?1, evidence = ?2 WHERE id = ?3",
                params![now, pattern.evidence, id]
            )?;
        } else {
            // Insert new pattern
            conn.execute(
                "INSERT INTO user_patterns (pattern_type, description, confidence, evidence, first_observed, last_updated, observation_count)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    pattern.pattern_type,
                    pattern.description,
                    pattern.confidence,
                    pattern.evidence,
                    pattern.first_observed,
                    pattern.last_updated,
                    pattern.observation_count
                ]
            )?;
        }
        Ok(())
    })
}

pub fn get_all_user_patterns() -> Result<Vec<UserPattern>> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, pattern_type, description, confidence, evidence, first_observed, last_updated, observation_count
             FROM user_patterns ORDER BY confidence DESC, observation_count DESC"
        )?;
        
        let patterns = stmt.query_map([], |row| {
            Ok(UserPattern {
                id: row.get(0)?,
                pattern_type: row.get(1)?,
                description: row.get(2)?,
                confidence: row.get(3)?,
                evidence: row.get(4)?,
                first_observed: row.get(5)?,
                last_updated: row.get(6)?,
                observation_count: row.get(7)?,
            })
        })?;
        
        patterns.collect()
    })
}

pub fn get_patterns_by_type(pattern_type: &str) -> Result<Vec<UserPattern>> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, pattern_type, description, confidence, evidence, first_observed, last_updated, observation_count
             FROM user_patterns WHERE pattern_type = ?1 ORDER BY confidence DESC"
        )?;
        
        let patterns = stmt.query_map([pattern_type], |row| {
            Ok(UserPattern {
                id: row.get(0)?,
                pattern_type: row.get(1)?,
                description: row.get(2)?,
                confidence: row.get(3)?,
                evidence: row.get(4)?,
                first_observed: row.get(5)?,
                last_updated: row.get(6)?,
                observation_count: row.get(7)?,
            })
        })?;
        
        patterns.collect()
    })
}

pub fn decay_low_confidence_patterns(threshold: f64, decay_amount: f64) -> Result<usize> {
    with_connection(|conn| {
        // Decay patterns that haven't been observed recently
        let affected = conn.execute(
            "UPDATE user_patterns SET confidence = MAX(0.1, confidence - ?1) WHERE confidence < ?2",
            params![decay_amount, threshold]
        )?;
        
        // Delete patterns with very low confidence and few observations
        conn.execute(
            "DELETE FROM user_patterns WHERE confidence < 0.2 AND observation_count < 3",
            []
        )?;
        
        Ok(affected)
    })
}

// ============ Conversation Summaries ============

pub fn save_conversation_summary(summary: &ConversationSummary) -> Result<()> {
    with_connection(|conn| {
        // Replace existing summary for this conversation
        conn.execute(
            "INSERT OR REPLACE INTO conversation_summaries 
             (conversation_id, summary, key_topics, emotional_tone, user_state, agents_involved, message_count, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                summary.conversation_id,
                summary.summary,
                summary.key_topics,
                summary.emotional_tone,
                summary.user_state,
                summary.agents_involved,
                summary.message_count,
                summary.created_at
            ]
        )?;
        Ok(())
    })
}

pub fn get_conversation_summary(conversation_id: &str) -> Result<Option<ConversationSummary>> {
    with_connection(|conn| {
        let result = conn.query_row(
            "SELECT id, conversation_id, summary, key_topics, emotional_tone, user_state, agents_involved, message_count, created_at
             FROM conversation_summaries WHERE conversation_id = ?1",
            params![conversation_id],
            |row| {
                Ok(ConversationSummary {
                    id: row.get(0)?,
                    conversation_id: row.get(1)?,
                    summary: row.get(2)?,
                    key_topics: row.get(3)?,
                    emotional_tone: row.get(4)?,
                    user_state: row.get(5)?,
                    agents_involved: row.get(6)?,
                    message_count: row.get(7)?,
                    created_at: row.get(8)?,
                })
            }
        );
        match result {
            Ok(s) => Ok(Some(s)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    })
}

pub fn get_recent_conversation_summaries(limit: usize) -> Result<Vec<ConversationSummary>> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, conversation_id, summary, key_topics, emotional_tone, user_state, agents_involved, message_count, created_at
             FROM conversation_summaries ORDER BY created_at DESC LIMIT ?1"
        )?;
        
        let summaries = stmt.query_map([limit], |row| {
            Ok(ConversationSummary {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                summary: row.get(2)?,
                key_topics: row.get(3)?,
                emotional_tone: row.get(4)?,
                user_state: row.get(5)?,
                agents_involved: row.get(6)?,
                message_count: row.get(7)?,
                created_at: row.get(8)?,
            })
        })?;
        
        summaries.collect()
    })
}

// ============ Recurring Themes ============

pub fn save_recurring_theme(theme: &str, conversation_id: &str) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    with_connection(|conn| {
        // Try to get existing theme
        let existing: Option<(i64, String)> = conn.query_row(
            "SELECT id, related_conversations FROM recurring_themes WHERE theme = ?1",
            params![theme],
            |row| Ok((row.get(0)?, row.get::<_, Option<String>>(1)?.unwrap_or_default()))
        ).ok();
        
        if let Some((id, existing_convs)) = existing {
            // Update existing theme
            let mut convs: Vec<String> = if existing_convs.is_empty() {
                Vec::new()
            } else {
                serde_json::from_str(&existing_convs).unwrap_or_default()
            };
            if !convs.contains(&conversation_id.to_string()) {
                convs.push(conversation_id.to_string());
            }
            let convs_json = serde_json::to_string(&convs).unwrap_or_default();
            
            conn.execute(
                "UPDATE recurring_themes SET frequency = frequency + 1, last_mentioned = ?1, related_conversations = ?2 WHERE id = ?3",
                params![now, convs_json, id]
            )?;
        } else {
            // Insert new theme
            let convs_json = serde_json::to_string(&vec![conversation_id]).unwrap_or_default();
            conn.execute(
                "INSERT INTO recurring_themes (theme, frequency, last_mentioned, related_conversations) VALUES (?1, 1, ?2, ?3)",
                params![theme, now, convs_json]
            )?;
        }
        Ok(())
    })
}

pub fn get_all_recurring_themes() -> Result<Vec<RecurringTheme>> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, theme, frequency, last_mentioned, related_conversations
             FROM recurring_themes ORDER BY frequency DESC"
        )?;
        
        let themes = stmt.query_map([], |row| {
            Ok(RecurringTheme {
                id: row.get(0)?,
                theme: row.get(1)?,
                frequency: row.get(2)?,
                last_mentioned: row.get(3)?,
                related_conversations: row.get(4)?,
            })
        })?;
        
        themes.collect()
    })
}

pub fn get_top_themes(limit: usize) -> Result<Vec<RecurringTheme>> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, theme, frequency, last_mentioned, related_conversations
             FROM recurring_themes ORDER BY frequency DESC LIMIT ?1"
        )?;
        
        let themes = stmt.query_map([limit], |row| {
            Ok(RecurringTheme {
                id: row.get(0)?,
                theme: row.get(1)?,
                frequency: row.get(2)?,
                last_mentioned: row.get(3)?,
                related_conversations: row.get(4)?,
            })
        })?;
        
        themes.collect()
    })
}

// ============ Reset ============

pub fn reset_all_data() -> Result<()> {
    let now = Utc::now().to_rfc3339();
    with_connection(|conn| {
        conn.execute("DELETE FROM messages", [])?;
        conn.execute("DELETE FROM conversations", [])?;
        conn.execute("DELETE FROM user_context", [])?;
        conn.execute("DELETE FROM user_facts", [])?;
        conn.execute("DELETE FROM user_patterns", [])?;
        conn.execute("DELETE FROM conversation_summaries", [])?;
        conn.execute("DELETE FROM recurring_themes", [])?;
        // Reset to default weights: Logic 50%, Psyche 30%, Instinct 20%
        conn.execute(
            "UPDATE user_profile SET api_key = NULL, instinct_weight = 0.20, logic_weight = 0.50, psyche_weight = 0.30, total_messages = 0, updated_at = ?1",
            params![now]
        )?;
        Ok(())
    })
}

