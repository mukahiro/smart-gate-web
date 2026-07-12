# データベース設計

## DB

- SQLite
- WALモードを有効化
- 外部キー制約を有効化
- busy timeoutを設定

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

## 主なテーブル

### people

- id
- name
- code
- card_id
- face_id
- organization
- is_active
- created_at
- updated_at

### access_events

- id
- event_id
- person_id
- method
- event_type
- authenticated_at
- received_at
- confidence
- created_at

### occupancy_states

- id
- person_id
- is_present
- last_event_id
- last_event_at
- updated_at

### users

- id
- username
- password_hash
- role
- is_active
- created_at
- updated_at

### sessions

- id
- user_id
- expires_at
- created_at

### audit_logs

- id
- user_id
- action
- target_type
- target_id
- before_data
- after_data
- created_at

## 制約

- `access_events.event_id`はUNIQUE
- `people.card_id`は必要に応じてUNIQUE
- `people.face_id`は必要に応じてUNIQUE
- `occupancy_states.person_id`はUNIQUE
