import type { PluralForms } from "../plural";

/** Helper that keeps every plural slot available to both languages. */
const p = (forms: PluralForms): PluralForms => forms;

export const en = {
  meta: {
    siteTitle: "ChessCoach — Learn chess openings line by line",
    siteDescription:
      "A free opening trainer with 30 courses and 954 lines: one idea for every move, a board that answers back, drills, exams and spaced review.",
    openingsTitle: "Opening Trainer — ChessCoach",
    openingsDescription:
      "Learn chess openings line by line with one clear idea per move, a board that answers back, and spaced review.",
    progressTitle: "Dashboard — ChessCoach",
    progressDescription:
      "Your chess opening progress: lines learned, reviews due, mastery and recent practice.",
    loginTitle: "Accounts — ChessCoach",
    loginDescription:
      "Sign in to sync your chess opening progress across devices. Progress also works locally without an account.",
    notFoundTitle: "Opening not found — ChessCoach",
    courseDescription:
      "{intro} One idea per move, with a trainer and spaced review.",
  },
  nav: {
    brand: "ChessCoach",
    openings: "Openings",
    dashboard: "Dashboard",
    signIn: "Sign in",
    signOut: "Sign out",
    language: "Language",
    switchTo: "العربية",
    switchToAria: "Switch to Arabic",
    footer: "ChessCoach · one idea per move",
  },
  common: {
    white: "White",
    black: "Black",
    all: "All",
    courses: "courses",
    lines: "lines",
    learned: "learned",
    finished: "finished",
    due: "due",
    start: "Start",
    continue: "Continue",
    train: "Train",
    review: "Review",
    back: "Back",
    next: "Next",
    progress: "Progress",
    arrowForward: "→",
    arrowBack: "←",
  },
  home: {
    eyebrow: "Chess openings, taught properly",
    titleLead: "Learn the opening",
    titleAccent: "one idea at a time.",
    lead:
      "Play your side's moves against a board that answers back. Every move gets one short explanation and one board highlight, so you learn the plan instead of memorising a move list.",
    browseCourses: "Browse all courses →",
    openDashboard: "Open dashboard",
    statCourses: "courses",
    statLines: "lines",
    statIdeas: "move ideas",
    features: {
      ideaTitle: "One idea per move",
      ideaText:
        "Each move gets one sentence and one key square, so the plan is obvious at a glance.",
      boardTitle: "A board that answers back",
      boardText:
        "You play your side. The trainer replies with the line, and a wrong move snaps the position back.",
      drillTitle: "Drill the repertoire",
      drillText:
        "Drill mode mixes due and new lines, so you have to remember the moves without a script.",
      reviewTitle: "Review before you forget",
      reviewText:
        "Clean runs enter a 1/3/7/14/30/60-day review queue, with mastery stars and a daily streak.",
    },
    coachEyebrow: "The coach",
    coachTitle: "One idea. One highlighted square.",
    coachText:
      "Hover or tap a linked word and the board shows only the squares or arrow that belongs to it. Step through the line, then train it from memory.",
    openEnglish: "Open the English course →",
    cardIdeaLabel: "5. Qc2",
    cardIdeaText:
      "Qc2 defends the c3-knight and covers e4, so Black cannot comfortably play ...e4.",
    cardWhyLabel: "Why now",
    cardWhyText:
      "It also prepares d4: after ...exd4, the e3-pawn recaptures and White gets the centre.",
    cardCarefulLabel: "Watch out",
    cardCarefulText:
      "Don't chase the bishop with a3 too early: ...Bxc3 forces bxc3 and doubles your pawns.",
  },
  catalogue: {
    eyebrow: "Opening trainer",
    title: "Learn a repertoire line by line.",
    lead:
      "Pick a course, play your side's moves, and the board answers back. Every move has one short idea, so you always know what the move is doing — not just where the piece goes.",
    startTraining: "Start training →",
    viewProgress: "View progress",
    statCourses: "courses",
    statLines: "lines",
    statLearned: "lines learned",
    statDue: "due review",
    how: {
      learnTitle: "Learn the idea",
      learnText: "One sentence per move, with the key square highlighted.",
      playTitle: "Play it back",
      playText:
        "You play your side; the board replies. A wrong move resets the position.",
      automaticTitle: "Make it automatic",
      automaticText:
        "A clean run enters the 1/3/7/14/30/60-day review queue.",
    },
    searchPlaceholder: "Search courses, tags, ECO…",
    searchAria: "Search courses",
    sortAria: "Sort courses",
    sideAria: "Side",
    sortLast: "Last played",
    sortProgress: "Most learned",
    sortAz: "A to Z",
    sortLastNoteTrained:
      "Most recently trained first. Courses you have not opened stay together in A to Z order.",
    sortLastNoteEmpty: "Nothing trained yet, so these stay in A to Z order.",
    sortProgressNote: "Courses with the most clean lines come first.",
    sortAzNote: "Alphabetical order, easiest for browsing a large library.",
    emptyTitle: "No courses match that filter.",
    emptyText: "Clear the search or switch back to All.",
    clearFilters: "Clear filters",
    openCourseAria: "Open {name}",
    positionLabel: "{name} position",
    due: "{count} due",
    learnedOf: "{learned}/{total} learned",
    finishedOf: "{finished}/{total} finished · {total} lines total",
    continueCourse: "Continue",
    startCourse: "Start",
    topics: "Topics",
  },
  course: {
    back: "All openings",
    repertoire: "{side} repertoire",
    interactiveCourse: "Interactive course",
    continueLearning: "Continue learning",
    startLearning: "Start learning",
    nextUp: "Next up",
    firstLesson: "First lesson",
    courseProgress: "Course progress",
    linesLearned: "Lines learned",
    progressEmpty:
      "Learn the first line, then make it clean with no hints.",
    progressDone:
      "Every line is clean. Keep them fresh with daily reviews.",
    progressLeft: pluralProgressLeft(),
    learned: "learned",
    finished: "finished",
    due: "due",
    line: "Line",
    searchPlaceholder: "Search lines, tags, ECO…",
    searchAria: "Search lines",
    deepNotesCount: pluralDeepNotes(),
    lineStatusDue: "✓ due",
    lineStatusClean: "✓ clean · ★ {mastery}/5",
    lineStatusFinished: "✓ finished",
    lineStatusLearning: "learning",
    lineStatusNew: "new",
    modeAria: "Mode",
    modes: {
      learn: "Learn",
      train: "Train",
      drill: "Drill",
      exam: "Exam",
    },
    examTitle: pluralExamTitle(),
    examTitleNone: "Finish a line first",
    toolbarNote: "{count} lines · one idea per move",
    reviewDue: "Review {count} due",
    startDailyDrill: "Start daily drill",
    studyBoardAria: "Study board",
    drill: "Drill",
    exam: "Exam",
    cleanCount: pluralCleanCount(),
    mistakes: pluralMistakes(),
    hintCount: pluralHints(),
    exitMode: "Exit {mode}",
    lesson: "Lesson {index} / {total}",
    cleanBadge: "✓ clean",
    finishedBadge: "✓ finished",
    step: "Step {ply} / {total}",
    movesAria: "Moves",
    hiddenMove: "Play the line to reveal it",
    coachAria: "Coach",
    playFromMemory: "Play from memory",
    hintHeading: "Hint: {san}",
    startHere: "Start here",
    kickerExam: "Exam",
    kickerHint: "Hint",
    kickerIdea: "The idea",
    kickerAbout: "About this line",
    statusLearned: "Line learned. It is now in your review queue.",
    statusFinished:
      "Line finished and saved. Replay it until it is clean.",
    statusStep: "Use ← → or the buttons to step through the line.",
    statusExamYourMove:
      "Exam — play {side}'s move from memory.",
    statusOpponentReplying: "{opponent} is replying…",
    statusYourMove: "Your move — play {side} on the board.",
    emptyExam:
      "Exam in progress: play the line from memory. No hints are available.",
    emptyFindMove:
      "Find {side}'s move on the board. The idea appears after the move.",
    emptyStep: "Step forward to see the next idea.",
    onBoard: "On the board:",
    hoverPhrase:
      "Hover or tap an underlined phrase to draw it on the board.",
    keySquare: "Key square highlighted on the board.",
    score: pluralScore(),
    controlStart: "Start",
    controlBack: "← Back",
    controlNext: "Next →",
    trainThisLine: "Train this line",
    restartLine: "Restart line",
    exitExam: "Exit exam",
    restart: "Restart",
    hint: "Hint",
    hideHint: "Hide hint",
    showMove: "Show move",
    newDrill: "New drill",
    examComplete: "Exam complete 🎯",
    drillComplete: "Drill complete 🎯",
    examScore:
      "Score {clean} / {total} clean ({pct}%) · {mistakes}.",
    drillScore: "{clean} of {total} lines clean · {mistakes}.",
    newExam: "New exam",
    reviewDueShort: "Review due",
    cleanLine: "Clean line ✓",
    lineFinished: "Line finished",
    lineLearned: "Line learned 🎉",
    examCleanText: "No mistakes and no hints. Next question.",
    examFinishedText: "Saved as finished for this exam. Next question.",
    learnedText:
      "Zero mistakes and zero hints. This line is now in your review queue.",
    finishedText: pluralFinishedText(),
    nextQuestion: "Next question →",
    replayUntilClean: "Replay until clean",
    nextLine: "Next line →",
    replay: "Replay",
    review: "Review",
    deepNotes: "Deep notes",
    hideDeepNotes: "Hide deep notes",
    noExtraNotes: "No extra notes on this move.",
    verify: "Verify",
    openLichess: "Open final position on Lichess ↗",
    feedbackCorrect: "{san} — correct.",
    feedbackWrong:
      "{san} isn't the line. The position has been reset — try again.",
    feedbackOpponent: "{opponent} plays {san}.",
    feedbackCoach: "Coach played {san}.",
    examNeedsFinished:
      "Finish at least one line first, then the exam will test it.",
  },
  dashboard: {
    eyebrow: "Your training",
    title: "Dashboard",
    lead:
      "Any completed attempt is finished. A run with no mistakes and no hints is clean and enters the review queue.",
    todayEyebrow: "Today",
    dueReady: pluralDueReady(),
    noReviews: "No reviews due",
    startFirst: "Start your first course",
    linesLearned: "{learned}/{total} lines learned",
    finishedCount: "{count} finished",
    dueCount: "{count} due",
    streak: "🔥 {count} day streak",
    reviewDue: "Review {count} due →",
    continueCourse: "Continue {name} →",
    browseCourses: "Browse courses →",
    allCourses: "All courses",
    statLinesLearned: "lines learned",
    statLinesFinished: "lines finished",
    statDue: "due for review",
    statAttempts: "total attempts",
    statCleanRate: "clean rate",
    statCoursesStarted: "courses started",
    coursesEyebrow: "Courses",
    courseTitle: "Your repertoire",
    browseAll: "Browse all {count} courses →",
    courseLearned: "{learned}/{total} learned",
    courseFinished: "{count} finished",
    courseDue: "{count} due",
    courseLines: "{count} lines",
    continueCta: "Continue",
    startCta: "Start",
    reviewCta: "Review {count}",
    recentEyebrow: "Recent",
    recentTitle: "Latest practice",
    empty:
      "No lines practiced yet. Open a course and choose Train to start tracking progress.",
    tableLine: "Line",
    tableCourse: "Course",
    tableMastery: "Mastery",
    tableNext: "Next review",
    tablePractice: "Practice",
    attempts: pluralAttempts(),
    cleanRuns: pluralCleanRuns(),
    train: "Train →",
    syncNow: "Sync now",
    syncing: "Syncing…",
    syncTitle: "Merge local progress with your account",
    reset: "Reset local progress",
    resetConfirm: "Clear all local progress on this device?",
    masteryAria: "Mastery {value} of 5",
  },
  login: {
    eyebrow: "Accounts",
    configuredTitle: "Cloud sync is not configured yet",
    configuredText:
      "The course works right now with progress saved in your browser. To enable accounts and cross-device sync, add your Supabase project keys and run the schema.",
    setupStrong: "Setup:",
    setupText:
      "create a free project at supabase.com, then add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, and run supabase/schema.sql in the SQL editor. Restart the dev server afterwards.",
    continueLocal: "Continue with local progress →",
    yourAccount: "Your account",
    signIn: "Sign in",
    createAccount: "Create an account",
    lead:
      "Signing in syncs your opening progress across devices. Without an account, everything is still saved locally in this browser.",
    signedInAs: "Signed in as {email}",
    goToCourses: "Go to your courses →",
    signOut: "Sign out",
    email: "Email",
    password: "Password",
    working: "Working…",
    noAccount: "No account? Create one",
    haveAccount: "Already have an account? Sign in",
    accountCreatedSynced:
      "Account created. Your local progress is synced.",
    accountCreatedConfirm:
      "Account created. Check your email to confirm the address, then sign in.",
    signedInMerged: "Signed in. Local and cloud progress are merged.",
    signedOut: "Signed out.",
    somethingWrong: "Something went wrong.",
  },
  theme: {
    label: "Theme",
    names: {
      teal: "Teal",
      blue: "Blue",
      violet: "Violet",
      amber: "Amber",
    },
    title: "Theme: {name}. Click to change.",
    aria: "Change theme colour. Current theme: {name}",
  },
  week: {
    dayStreak: "Day streak",
    aria: "Training this week",
    days: ["M", "T", "W", "T", "F", "S", "S"],
    names: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    trained: "trained",
    notTrained: "not trained yet",
    dayAria: "{name}, {status}",
  },
  coach: {
    panelAria: "Coach explanations",
    badge: "Coach",
    legendAria: "Colour key",
    idea: "The idea",
    why: "Why now",
    careful: "Watch out",
    kindIdea: "Idea",
    kindWhy: "Why",
    kindCareful: "Careful",
    onBoard: "On the board",
    hint:
      "Hover a card, or tap an underlined phrase, to draw that detail on the board.",
  },
  idea: {
    showOnBoard: "Show {label} on the board",
    moveLabel: "{san}: {from} to {to}",
    moveName: "The move {san}",
    square: "The {square} square",
    piece: "The {piece} move",
    centre: "The centre",
    fianchetto: "The fianchetto bishop",
    longDiagonal: "The long diagonal",
    cFile: "The c-file",
    eFile: "The e-file",
    d4Break: "The d4 break",
    kingSafety: "King safety",
    sources: {
      lichess: "Check this line on Lichess",
      openingIndex: "Opening index — Wikipedia",
      ecoCodes: "ECO codes — Wikipedia",
    },
  },
  notFound: {
    title: "Opening not found",
    text: "That course does not exist. Browse the catalogue to find another one.",
    back: "Browse all courses →",
  },
};

/** Plural forms kept outside the object for readability. */
function pluralProgressLeft(): PluralForms {
  return p({
    one: "{count} line left to make clean.",
    other: "{count} lines left to make clean.",
    zero: "Every line is clean.",
  });
}

function pluralDeepNotes(): PluralForms {
  return p({
    one: "{count} deep note",
    other: "{count} deep notes",
  });
}

function pluralExamTitle(): PluralForms {
  return p({
    one: "Exam {count} finished line",
    other: "Exam {count} finished lines",
  });
}

function pluralMistakes(): PluralForms {
  return p({
    one: "{count} mistake",
    other: "{count} mistakes",
    zero: "0 mistakes",
  });
}

function pluralCleanCount(): PluralForms {
  return p({
    one: "{count} clean line",
    other: "{count} clean lines",
    zero: "0 clean lines",
  });
}

function pluralHints(): PluralForms {
  return p({
    one: "{count} hint",
    other: "{count} hints",
    zero: "0 hints",
  });
}

function pluralScore(): PluralForms {
  return p({
    one: "{count} mistake · {hints}.",
    other: "{count} mistakes · {hints}.",
  });
}

function pluralFinishedText(): PluralForms {
  return p({
    one:
      "Saved as finished. {count} mistake and {hints} — replay it until it is clean.",
    other:
      "Saved as finished. {count} mistakes and {hints} — replay it until it is clean.",
  });
}

function pluralDueReady(): PluralForms {
  return p({
    one: "{count} line ready for review",
    other: "{count} lines ready for review",
  });
}

function pluralCleanRuns(): PluralForms {
  return p({
    one: "{count} clean run",
    other: "{count} clean runs",
    zero: "0 clean runs",
  });
}

function pluralAttempts(): PluralForms {
  return p({
    one: "{count} attempt",
    other: "{count} attempts",
  });
}

export type Messages = typeof en;
