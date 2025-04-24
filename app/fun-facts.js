const facts = [
    "The game 'Student-trainer' was my first team-based Unity project, and I learned to write cleaner C# code through weekly mentor reviews.",
    "In my Machine Learning class, I used scikit-learn to predict wine quality – with ~78% accuracy!",
    "I wrote a Flask app that fetches currency rates from the NBP API and displays them dynamically in PLN.",
    "GreenTextLang, my custom language interpreter, can parse and evaluate expressions using ANTLR – and even gives helpful syntax suggestions!",
    "In Java, I built a game where you shoot moving objects and validated the logic using JUnit tests.",
    "I used PostgreSQL functions and triggers to automate a student database – and aced all the exams with that knowledge.",
    "One of my GitHub projects uses React to build a weather app with real-time OpenWeatherMap API integration.",
    "I'm currently IT Team Coordinator in AGH's Student Council and co-organized a major conference – including sponsors like PwC and MedApp!"
  ];
  
  function showRandomFact() {
    const randomIndex = Math.floor(Math.random() * facts.length);
    document.getElementById("fact-display").textContent = facts[randomIndex];
  }
  