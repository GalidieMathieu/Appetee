# Appetee Product Specification

**Status:** Draft  
**Version:** 0.2  
**Owner:** Mathieu Galidie  
**Last updated:** 2026-08-05

---

## 1. Product summary

Appetee is a personalized recipe and meal-planning application that helps users
find and adapt meals to their diet, eating habits, and nutrition goals.

The application combines recipe discovery, favorites, cooking guidance, meal
planning, nutrition information, and estimated meal costs in one experience.

---

## 2. Product goal

Appetee should make it easier for users to answer:

> What should I cook, and does it fit the way I eat?

The product is especially useful for people who regularly plan their meals,
prepare food in advance, follow dietary preferences, or target specific
nutrition values.

This may include:

- Students
- Athletes
- Working adults
- Meal-prep users
- Users managing calories or macronutrients

---

## 3. Core product scope

### Accounts and preferences

Users can:

- Create an account
- Log in and log out
- Select one or more diets
- Select ingredients they want to avoid
- Update diets and avoided ingredients from their profile

After account creation, the user is automatically logged in.

Email verification, CAPTCHA protection, and additional account-security
features may be added later.

Diets and avoided ingredients are automatically applied to recipe discovery.
They are not selected again during every search.

---

### Recipe discovery

Users can:

- Browse recipes
- Search by recipe name
- Search by ingredient name
- Filter recipes
- Search using a small number of selected ingredients
- View saved recipes
- Open recipe details

For the initial version, ingredient-based search will support approximately two
or three selected ingredients.

This is not a complete pantry-management system.

---

### Recipe information

A recipe can contain:

- Name
- Description
- Image
- Ingredients
- Ingredient quantities
- Ordered cooking instructions
- Serving count
- Preparation time
- Nutrition information
- Estimated cost
- Diet compatibility
- Recipe badges

---

### Recipe badges

Badges describe useful characteristics of a recipe.

Examples include:

- High protein
- Low calorie
- Meal prep
- Freezer friendly
- Quick meal
- Budget friendly

Badges are different from diets.

Diets determine whether a recipe is compatible with the user. Badges help
users identify recipes that match their habits or goals.

Users may eventually be able to filter recipes by badge.

---

### Favorites

Users can:

- Save recipes
- Remove saved recipes
- View their favorite recipes
- Access a limited favorite-recipe preview from the Home page

The same recipe cannot be saved more than once by the same user.

---

### Meal planning

Users can:

- Create a meal plan
- Add recipes to planned days
- Remove or replace planned recipes
- Select servings
- View their current meal plan
- Access upcoming meals from the Home page

The initial meal-planning system will focus on manual planning.

Automatic meal-plan generation may be added later.

---

### Cooking mode

Cooking mode provides a focused step-by-step interface.

Users can:

- View the current instruction
- Move between cooking steps
- View ingredients and quantities
- Track their progress
- Exit cooking mode

Cooking mode must be designed primarily for mobile use because users are more
likely to use a phone than a desktop computer while cooking.

Appetee will initially remain a responsive web application. A native or
cross-platform mobile application may be considered later.

---

### Adaptive nutrition

A future version of Appetee will allow supported recipes to be adjusted to a
user's nutrition target.

Examples include:

- Protein per serving
- Carbohydrates per serving
- Calories per serving

For example, a user may request 40 grams of protein per serving. Appetee could
increase the amount of chicken while maintaining realistic recipe quantities.

Recipes will identify which ingredients may be adjusted.

When a recipe is adjusted, Appetee should recalculate:

- Ingredient quantities
- Protein
- Carbohydrates
- Calories
- Estimated cost
- Meal-plan quantities

The application must reject impossible or unrealistic adjustments.

---

## 4. Ingredient information

Ingredients are shared catalog items used by recipes.

When an ingredient is created, the required information includes:

- Name
- Image
- Protein information
- Carbohydrate information
- Estimated price

Additional nutrition information may also be stored.

Ingredient data is used to calculate recipe nutrition and estimated meal cost.

---

## 5. Estimated pricing model

Appetee provides approximate prices rather than real-time retailer prices.

The ingredient price is entered when the ingredient is created and is based on
a reasonable current-market estimate, using Walmart pricing as an initial
reference.

The product does not currently:

- Connect directly to Walmart
- Store a retailer source for every price
- Store a retailer location
- Compare stores
- Compare product quality levels
- Track live price changes
- Guarantee an exact checkout price

The same estimated ingredient price is used to calculate:

- Recipe cost
- Cost per serving
- Meal-plan cost

Prices may become outdated and may differ according to location, brand,
package size, product quality, and market conditions.

The application must clearly identify these values as estimates.

A fixed accuracy claim, such as remaining within 10% for several years, should
not be made because food prices can change significantly.

---

## 6. Avoided ingredients

Appetee currently treats every avoided ingredient in the same way.

A user may avoid an ingredient because of:

- An allergy
- An intolerance
- A dislike
- A personal preference

The reason does not change the filtering behavior.

Recipes containing an avoided ingredient are excluded from compatible recipe
results.

### Future ingredient groups

A future version may organize related ingredients into groups such as:

- Nuts
- Shellfish
- Fish
- Dairy
- Eggs
- Soy

Selecting a group could add all ingredients within that group to the user's
avoided ingredients.

Users should still be able to review and modify the individual ingredients
selected through a group.

---

## 7. Home page principles

The Home page should remain simple.

It should contain:

- A recipe or ingredient search
- The current meal plan, when one exists
- An option to start meal planning when no plan exists
- A limited favorite-recipe preview
- Clear access to all recipes

Advanced search options and filters belong on the Recipes page.

---

## 8. Administrative tools

Authorized administrators can manage:

- Ingredients
- Ingredient nutrition
- Estimated ingredient prices
- Recipes
- Recipe images
- Recipe instructions
- Ingredient quantities
- Diet compatibility
- Recipe badges

Administrative functionality must not be accessible to normal users.

---

## 9. Product non-goals

The current product does not include:

- Public user recipe publishing
- Social feeds, followers, comments, or messaging
- Real-time grocery prices
- Retailer or product-quality comparison
- Grocery ordering or delivery
- Complete pantry quantity tracking
- Medical or allergy guarantees
- A native mobile application

Users may eventually be able to create a small number of private recipes that
are visible only to their own account.

Public recipe publishing is not currently planned.

---

## 10. Product phases

### Phase 1 — Recipe foundation

- Accounts and authentication
- Diets and avoided ingredients
- Recipe browsing and search
- Recipe details
- Favorites
- Administrative recipe and ingredient creation

### Phase 2 — Cooking and meal planning

- Cooking mode
- Serving adjustments
- Weekly meal planning
- Home-page meal-plan preview

### Phase 3 — Improved recipe discovery

- Multiple-ingredient search
- Recipe badges
- Badge filtering
- Avoided-ingredient groups

### Phase 4 — Adaptive nutrition

- Protein targets
- Carbohydrate targets
- Calorie targets
- Adjustable recipe ingredients
- Nutrition recalculation
- Adjusted cost calculation

### Possible future capabilities

- Private user-created recipes
- Automatic meal-plan generation
- Cross-platform mobile application
- Improved price updating

---

## 11. Technology

Appetee currently uses:

### Frontend

- Angular
- TypeScript
- Responsive web design

### Backend

- ASP.NET Core
- C#
- Dapper
- REST APIs
- Cookie authentication

### Data and hosting

- MySQL
- Azure App Service
- Azure Database for MySQL
- Azure Blob Storage

Detailed technical work is currently documented in the engineering initiative
folders. A dedicated architecture area may be added later only when it becomes
useful and can be maintained without duplication.

---

## 12. Related specifications

Detailed requirements belong in separate feature folders under
`../features/`. Feature IDs are assigned when a feature specification is
formally created.

Planned feature specifications include:

- Authentication
- User preferences
- Home
- Recipe discovery
- Recipe details
- Favorites
- Cooking mode
- Meal planning
- Adaptive nutrition
- Administrative recipe management
