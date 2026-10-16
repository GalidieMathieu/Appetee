# Appetee Meal Planner V1 ERD

## Mermaid ERD

```mermaid
erDiagram

    USERS ||--o{ NUTRITION_PLANS : owns
    USERS ||--o| MEAL_PLAN_USER_SETTINGS : has
    NUTRITION_PLANS ||--o{ MEAL_PLAN_USER_SETTINGS : selected_as_current

    USERS ||--o{ MEAL_PLAN_TEMPLATES : owns

    USERS ||--o{ MEAL_PLAN_DAYS : owns
    MEAL_PLAN_TEMPLATES ||--o{ MEAL_PLAN_DAYS : contains

    MEAL_PLAN_DAYS ||--o{ MEAL_PLAN_DAY_MEALS : contains
    MEAL_PLAN_DAY_MEALS ||--o{ MEAL_PLAN_MEAL_ITEMS : contains

    RECIPES ||--o{ MEAL_PLAN_MEAL_ITEMS : referenced_by
    MEAL_PLAN_MEAL_ITEMS ||--o| MEAL_PLAN_MANUAL_ITEMS : manual_details

    RECIPES ||--o{ RECIPE_INGREDIENTS : contains
    INGREDIENTS ||--o{ RECIPE_INGREDIENTS : used_in
    INGREDIENTS ||--o| INGREDIENT_NUTRITION : has

    USERS ||--o{ USER_DIETS : follows
    DIETS ||--o{ USER_DIETS : selected_by

    DIETS ||--o{ DIET_RECIPES : classifies
    RECIPES ||--o{ DIET_RECIPES : belongs_to

    USERS ||--o{ USER_INGREDIENT_RESTRICTIONS : has
    INGREDIENTS ||--o{ USER_INGREDIENT_RESTRICTIONS : restricted

    USERS ||--o{ FAVORITE_RECIPES : saves
    RECIPES ||--o{ FAVORITE_RECIPES : favorited

    USERS ||--o{ PASSWORD_RESET_TOKENS : owns


    USERS {
        bigint id PK
        decimal height_cm
        decimal weight_kg
        int birth_year
        string calculation_sex
    }


    NUTRITION_PLANS {
        bigint id PK
        bigint user_id FK
        string name
        string mode
        string goal
        string activity_level
        boolean is_recovery
        int default_meals_per_day
        decimal estimated_rmr_kcal
        decimal estimated_maintenance_kcal
        decimal target_calories
        decimal target_protein_g
        decimal target_carbs_g
        decimal target_fat_g
        string calculation_policy_version
        datetime calculated_at
    }


    MEAL_PLAN_USER_SETTINGS {
        bigint user_id PK
        bigint current_nutrition_plan_id FK
        datetime updated_at
    }


    MEAL_PLAN_TEMPLATES {
        bigint id PK
        bigint user_id FK
        string name
        datetime created_at
        datetime updated_at
    }


    MEAL_PLAN_DAYS {
        bigint id PK
        bigint user_id FK
        date plan_date
        bigint template_id FK
        int day_index
        datetime created_at
        datetime updated_at
    }


    MEAL_PLAN_DAY_MEALS {
        bigint id PK
        bigint meal_plan_day_id FK
        string name
        int sort_order
        datetime created_at
        datetime updated_at
    }


    MEAL_PLAN_MEAL_ITEMS {
        bigint id PK
        bigint meal_plan_day_meal_id FK
        string item_type
        bigint recipe_id FK
        int quantity
        int sort_order
        datetime created_at
        datetime updated_at
    }


    MEAL_PLAN_MANUAL_ITEMS {
        bigint meal_plan_meal_item_id PK
        string name
        decimal calories
        decimal protein_g
        decimal carbs_g
        decimal fat_g
    }


    RECIPES {
        bigint id PK
        string name
        decimal calories
        decimal protein_g
        decimal carbs_g
        decimal fat_g
    }


    INGREDIENTS {
        bigint id PK
        string name
    }


    RECIPE_INGREDIENTS {
        bigint recipe_id FK
        bigint ingredient_id FK
        decimal quantity
        string unit
    }


    INGREDIENT_NUTRITION {
        bigint ingredient_id PK
        decimal calories
        decimal protein_g
        decimal carbs_g
        decimal fat_g
    }


    DIETS {
        bigint id PK
        string name
    }


    USER_DIETS {
        bigint user_id FK
        bigint diet_id FK
    }


    DIET_RECIPES {
        bigint diet_id FK
        bigint recipe_id FK
    }


    USER_INGREDIENT_RESTRICTIONS {
        bigint user_id FK
        bigint ingredient_id FK
    }


    FAVORITE_RECIPES {
        bigint user_id FK
        bigint recipe_id FK
        datetime created_at
    }


    PASSWORD_RESET_TOKENS {
        bigint id PK
        bigint user_id FK
        string token_hash
        datetime expires_at
    }
```

## Important V1 constraints

### MEAL_PLAN_DAYS
A row is either a real dated day or a template day.

DATED:
- `plan_date` required
- `template_id` NULL
- `day_index` NULL

TEMPLATE:
- `plan_date` NULL
- `template_id` required
- `day_index` 0-6

Recommended constraints:
- `UNIQUE(user_id, plan_date)`
- `UNIQUE(template_id, day_index)`

### MEAL_PLAN_MEAL_ITEMS

RECIPE:
- `item_type = RECIPE`
- `recipe_id` required
- `quantity` integer >= 1

MANUAL:
- `item_type = MANUAL`
- `recipe_id` NULL
- `quantity` NULL
- one matching `MEAL_PLAN_MANUAL_ITEMS` row

### Manual item validation
- name required
- calories > 0
- protein_g > 0
- carbs_g > 0
- fat_g > 0
