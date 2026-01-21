import { useMemo } from "react";

const MESSAGES = {
  morning: [
    "Good morning",
    "Rise and shine",
    "A fresh start awaits you",
    "Hope your morning is amazing",
    "Let’s make today count",
  ],
  afternoon: [
    "Good afternoon",
    "Hope your day is going well",
    "Keep up the great work",
    "You’re doing great today",
    "Halfway to success",
  ],
  evening: [
    "Good evening",
    "Time to slow things down",
    "Hope you had a productive day",
    "Relax, you’ve earned it",
    "Evenings are for reflection",
  ],
  night: [
    "Good night",
    "Time to recharge",
    "Rest well",
    "Sweet dreams ahead",
    "Tomorrow is another chance",
  ],
};

function getTimePeriod(hour) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export default function GreetingMessage({ name }) {
  const { period, message } = useMemo(() => {
    const hour = new Date().getHours();
    const period = getTimePeriod(hour);
    const messages = MESSAGES[period];
    const randomMessage =
      messages[Math.floor(Math.random() * messages.length)];

    return { period, message: randomMessage };
  }, []);

  return (
    <div className="px-2 py-4">
      {/* <p className="text-sm text-slate-400 capitalize">{period}</p> */}
      <h1 className="mt-1 text-xl font-semibold">
        {message}, <span className="text-indigo-400">{name}</span>.
      </h1>
    </div>
  );
}
