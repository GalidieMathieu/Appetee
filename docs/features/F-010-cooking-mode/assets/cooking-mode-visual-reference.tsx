import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  ListChecks,
  Pause,
  Play,
  RotateCcw,
  Users,
} from "lucide-react";
import LayoutAuth from "@/components/LayoutAuth";
import { getFakeRecipeById } from "@/lib/fake-recipes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function CookRecipe() {
  const navigate = useNavigate();
  const { recipeId } = useParams();
  const recipe = getFakeRecipeById(recipeId || "");
  const [currentStep, setCurrentStep] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<string[]>([]);

  const progress = useMemo(() => {
    if (!recipe) return 0;
    return ((currentStep + 1) / recipe.instructions.length) * 100;
  }, [currentStep, recipe]);

  if (!recipe) {
    return (
      <LayoutAuth>
        <div className="container mx-auto px-4 py-20 max-w-xl text-center">
          <h1 className="text-3xl font-bold">Recipe not found</h1>
          <p className="text-muted-foreground mt-3">This cooking session is no longer available.</p>
          <Button className="mt-6" onClick={() => navigate("/recipes")}>Back to recipes</Button>
        </div>
      </LayoutAuth>
    );
  }

  const isFinished = currentStep === recipe.instructions.length - 1;

  return (
    <LayoutAuth>
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4 py-6 sm:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <Button variant="ghost" className="gap-2" onClick={() => navigate("/recipes")}>
              <ArrowLeft className="h-4 w-4" /> Exit Cooking Mode
            </Button>
            <Badge variant="secondary" className="gap-2 px-3 py-1.5">
              <ListChecks className="h-4 w-4" /> Cooking mode
            </Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <main className="space-y-6">
              <Card className="overflow-hidden">
                <div className="relative h-56 sm:h-72">
                  <img src={recipe.image} alt={recipe.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <Badge className="mb-3">{recipe.mealType === "prep" ? "Prep meal" : "Day meal"}</Badge>
                    <h1 className="text-3xl sm:text-4xl font-bold">{recipe.title}</h1>
                  </div>
                </div>
                <CardContent className="p-5 sm:p-6 space-y-5">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> {recipe.time}</span>
                    <span className="flex items-center gap-2"><Users className="h-4 w-4" /> {recipe.servings}</span>
                    <span className="flex items-center gap-2"><Flame className="h-4 w-4" /> {Math.round((Number.parseInt(recipe.calories, 10) || 0) * servingMultiplier)} cal</span>
                  </div>
                  <p className="text-muted-foreground">{recipe.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {recipe.diet.map((diet) => <Badge key={diet} variant="secondary">{diet}</Badge>)}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 shadow-lg">
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-primary">Step {currentStep + 1} of {recipe.instructions.length}</p>
                      <CardTitle className="text-2xl mt-1">{isFinished ? "Final step" : "Let's cook"}</CardTitle>
                    </div>
                    {isFinished && <CheckCircle2 className="h-8 w-8 text-emerald-500" />}
                  </div>
                  <Progress value={progress} className="h-3" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-2xl bg-primary/5 border border-primary/10 p-6 sm:p-10 min-h-48 flex items-center">
                    <p className="text-2xl sm:text-3xl leading-relaxed font-medium text-foreground">
                      {recipe.instructions[currentStep]}
                    </p>
                  </div>

                  {isFinished ? (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800">
                      Your recipe is ready. Enjoy your meal or portion it into containers for later.
                    </div>
                  ) : (
                    <div className="rounded-xl border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">Need a moment?</p>
                        <p className="text-sm text-muted-foreground">Use the timer control while you finish this step.</p>
                      </div>
                      <Button variant="outline" className="gap-2" onClick={() => setIsTimerRunning((running) => !running)}>
                        {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isTimerRunning ? "Pause timer" : "Start timer"}
                      </Button>
                    </div>
                  )}

                  <div className="sticky bottom-0 z-20 -mx-6 -mb-6 flex flex-col-reverse gap-3 border-t bg-background/95 p-4 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
                      disabled={currentStep === 0}
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous step
                    </Button>
                    {isFinished ? (
                      <Button className="gap-2" onClick={() => setCurrentStep(0)}>
                        <RotateCcw className="h-4 w-4" /> Cook again
                      </Button>
                    ) : (
                      <Button className="gap-2" onClick={() => setCurrentStep((step) => Math.min(recipe.instructions.length - 1, step + 1))}>
                        Next step <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </main>

            <aside className="space-y-6">
              <Card className="lg:sticky lg:top-24">
                <CardHeader className="space-y-4">
                  <CardTitle>Ingredients</CardTitle>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2 text-sm">
                    <span className="text-muted-foreground">Servings</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setServingMultiplier((value) => Math.max(1, value - 1))}>−</Button>
                      <span className="w-6 text-center font-semibold">{servingMultiplier}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setServingMultiplier((value) => Math.min(6, value + 1))}>+</Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Quantities are shown per base serving and scale with your selection.</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {recipe.ingredients.map((ingredient, index) => {
                      const checked = checkedIngredients.includes(ingredient);
                      const quantity = recipe.ingredientQuantities[index];
                      return (
                        <li key={ingredient}>
                          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${checked ? "border-emerald-200 bg-emerald-50" : "hover:bg-muted/50"}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setCheckedIngredients((current) => checked ? current.filter((item) => item !== ingredient) : [...current, ingredient])}
                              className="h-4 w-4 accent-primary"
                            />
                            <span className={`flex-1 text-sm ${checked ? "text-emerald-800 line-through" : "text-muted-foreground"}`}>{ingredient}</span>
                            <span className="text-xs font-medium text-foreground">{quantity.value * servingMultiplier} {quantity.unit}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cooking progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recipe.instructions.map((instruction, index) => (
                    <button
                      key={instruction}
                      type="button"
                      onClick={() => setCurrentStep(index)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${index === currentStep ? "border-primary bg-primary/5" : index < currentStep ? "border-emerald-200 bg-emerald-50" : "hover:bg-muted/50"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${index < currentStep ? "bg-emerald-500 text-white" : index === currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {index < currentStep ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                        </div>
                        <span className="text-sm line-clamp-2">{instruction}</span>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </LayoutAuth>
  );
}
