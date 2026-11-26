/**
 * The English dictionary is the source of truth: its keys define MessageKey,
 * so a missing Spanish key fails type-check.
 */
export const en = {
  "locale.label": "Language",

  "app.allTalks": "Presentalia — all talks",
  "nav.main": "Main",
  "nav.talks": "Talks",
  "nav.users": "Users",
  "nav.accountMenu": "Account menu",
  "nav.signOut": "Sign out",
  "nav.overview": "Overview",
  "nav.activities": "Activities",
  "nav.roster": "Roster",
  "nav.slides": "Slides",
  "nav.talkSections": "Talk sections",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.delete": "Delete",
  "common.remove": "Remove",
  "common.retry": "Retry",
  "common.back": "Back",
  "common.next": "Next",
  "common.loading": "Loading…",
  "common.noEmail": "No email address",
  "common.more": "+{count} more",
  "common.you": "(you)",

  "roles.admin": "Admin",
  "roles.presenter": "Presenter",
  "roles.attendee": "Attendee",
  "roles.adminPlural": "Admins",
  "roles.presenterPlural": "Presenters",
  "roles.attendeePlural": "Attendees",

  "status.live": "LIVE",
  "status.closed": "CLOSED",
  "status.ranking": "RANKING",

  "login.title": "Sign in to Presentalia",
  "login.subtitle":
    "Enter your rostered or presenter email address. We'll send you a one-time sign-in link — no password needed.",
  "login.linkExpired":
    "That sign-in link is no longer valid. Please request a new one.",
  "login.accessDenied":
    "This email address does not have access yet. Ask a presenter to add it to a talk's roster or an admin to add it as a presenter.",
  "login.emailLabel": "Email address",
  "login.emailPlaceholder": "you@company.com",
  "login.send": "Send sign-in link →",
  "login.sending": "Sending…",
  "login.sentTitle": "Check your inbox — a sign-in link is on its way.",
  "login.sentDetail":
    "The link signs you in to the talks your email address is registered for.",

  "join.nameLabel": "Your name for this talk",
  "join.namePlaceholder": "e.g. Sam",
  "join.nameHint":
    "This is how you appear in results. Names are unique in a talk and cannot be changed later.",
  "join.join": "Join the talk",
  "join.joining": "Joining…",
  "join.closedTitle": "Joining is closed",
  "join.closedDetail":
    "The presenter is not admitting new anonymous attendees to this talk right now.",

  "talks.title.all": "All talks",
  "talks.title.yours": "Your talks",
  "talks.subtitle.admin":
    "Create and manage talks, rosters, slides, and activities.",
  "talks.subtitle.presenter":
    "Talks you created and talks you were invited to.",
  "talks.subtitle.attendee": "Talks your email address is registered for.",
  "talks.new": "+ New talk",
  "talks.empty.admin": "No talks yet. Create your first talk to get started.",
  "talks.empty.presenter":
    "No talks yet. Create your first talk or ask a presenter to add you to one.",
  "talks.empty.attendee":
    "You don't have access to any talks yet. Ask an admin or presenter to add you to a talk.",
  "talks.owner": "Owner:",
  "talks.slidesAvailable": "📄 Slides available",

  "talk.joinQr": "Join QR",
  "talk.joinedAs": "Joined as {name}",
  "talk.liveNow": "Live now",
  "talk.noActive": "No active activity right now.",
  "talk.readyActivities": "Ready activities",
  "talk.materials": "Materials",
  "talk.downloadSlides": "📄 Download the slides (PDF)",
  "talk.slidesUploaded": "Uploaded {date}",
  "talk.noSlides": "Slides have not been uploaded yet.",
  "talk.pastActivities": "Past activities ({count})",
  "talk.results": "Results →",
  "talk.dangerZone": "Danger zone",
  "talk.launchBlockedRanking":
    "Results are being prepared for the current activity. Wait for it to close before launching another.",
  "talk.launchBlockedLive": "Close the live activity before launching another.",
  "talk.activityOpen": "{type} is open: {question}",
  "talk.activityRanking": "{type} is being ranked: {question}",
  "talk.tapAnswer": "Tap to answer →",
  "talk.tapIdea": "Tap to submit an idea →",
  "talk.tapVote": "Tap to vote and see results →",
  "talk.tapOpen": "Tap to open the live activity →",
  "talk.resultsPreparing": "Results are being prepared →",
  "talk.deleteButton": "Delete talk…",
  "talk.deleteAria": "Delete talk",
  "talk.deleteConfirm":
    "Delete {name}? This removes its attendee roster, polls and votes, and the uploaded slides, and revokes all attendee access. This cannot be undone.",
  "talk.deleting": "Deleting…",
  "talk.deleteYes": "Yes, delete this talk",

  "activity.type.poll": "Poll",
  "activity.type.quiz": "Quiz",
  "activity.type.text": "Text prompt",
  "activity.type.cloud": "Idea cloud",
  "activity.launch.button": "Launch {type}…",
  "activity.close.button": "Close {type}…",
  "activity.launching": "Launching…",
  "activity.closing": "Closing…",
  "activity.launchYes": "Yes, launch {type} 🎉",
  "activity.closeYes.poll": "Yes, close voting",
  "activity.closeYes.quiz": "Yes, close quiz",
  "activity.closeYes.text": "Yes, close text prompt",
  "activity.closeYes.cloud": "Yes, close idea cloud",
  "activity.closed.poll":
    "This poll is closed. Its question, options, and results setting are read-only.",
  "activity.closed.quiz":
    "This quiz is closed. Its question, options, and results setting are read-only. The correct answer is now visible.",
  "activity.closed.text":
    "This text prompt is closed. Its question and results setting are read-only. Its ranking is final.",
  "activity.closed.cloud":
    "This idea cloud is closed. Its question is read-only and its ideas are final.",
  "activity.launchPrompt.poll":
    "Launch this poll now? Attendees will be able to vote, and the question, options, and results identity setting will be locked.",
  "activity.launchPrompt.quiz":
    "Launch this quiz now? Attendees will be able to vote, and the question, options, and results identity setting will be locked.",
  "activity.launchPrompt.text":
    "Launch this text prompt now? Attendees will be able to submit one answer each, and the prompt and criterion will be locked.",
  "activity.launchPrompt.cloud":
    "Launch this idea cloud now? Attendees will be able to submit one word or short phrase each, and the question will be locked.",
  "activity.closePrompt.poll":
    "Close voting now? Attendees will no longer be able to submit votes, but everyone authorized can still see the final results.",
  "activity.closePrompt.quiz":
    "Close this quiz now? Attendees will no longer be able to submit votes, and the correct answer will be revealed to everyone with access.",
  "activity.closePrompt.text":
    "Close this text prompt now? Attendees will no longer be able to submit answers, and every answer will be published unranked.",
  "activity.closePrompt.cloud":
    "Close this idea cloud now? Attendees will no longer be able to submit ideas, and the final cloud will be visible to everyone with access.",

  "createTalk.nameLabel": "Talk name",
  "createTalk.namePlaceholder": "AI Agents in Production",
  "createTalk.dateLabel": "Date",
  "createTalk.optional": "(optional)",
  "createTalk.descriptionLabel": "Description",
  "createTalk.descriptionPlaceholder": "What this talk is about",
  "createTalk.publicTitle": "Public talk (anonymous joining)",
  "createTalk.publicDetail":
    "Anyone with the join QR can enter a username and take part. You can stop new joins at any time from the talk's access page.",
  "createTalk.creating": "Creating…",
  "createTalk.create": "Create talk",

  "activities.title": "Activities",
  "activities.new": "+ New activity",
  "activities.empty":
    "No activities yet. Create your first activity to get started.",
  "activities.section.active": "Active",
  "activities.section.ranking": "Ranking",
  "activities.section.ready": "Ready",
  "activities.section.closed": "Closed",
  "activities.manage": "Manage →",
  "activities.results": "Results →",
  "activities.chooseSubtitle": "{name} — choose what to create.",
  "activities.types": "Activity types",
  "activities.create": "Create →",
  "activities.detail.poll":
    "Ask a multiple-choice question and show the results live.",
  "activities.detail.quiz":
    "Ask a question with one correct answer and reveal it at the end.",
  "activities.detail.text":
    "Collect short written answers and rank them against your criterion with AI.",
  "activities.detail.cloud":
    "Collect one word or short phrase per person and grow the repeated ideas on the big screen.",
  "activities.newPoll": "New poll",
  "activities.newQuiz": "New quiz",
  "activities.newText": "New text prompt",
  "activities.newCloud": "New idea cloud",
  "activities.back": "New activity",

  "form.creating": "Creating…",
  "form.remove": "Remove",
  "poll.questionLabel": "Poll question",
  "poll.questionPlaceholder":
    "Which AI agent framework are you most excited to use?",
  "poll.optionsLegend": "Answer options",
  "poll.optionsHint": "(2–8)",
  "poll.optionAria": "Answer option {number}",
  "poll.optionPlaceholder": "Option {number}",
  "poll.removeOptionAria": "Remove option {number}",
  "poll.addOption": "+ Add an option",
  "poll.identifiableTitle": "Show voter names in results",
  "poll.identifiableDetail":
    "Off by default. This choice cannot be changed after you launch the poll.",
  "poll.create": "Create poll",
  "quiz.questionLabel": "Quiz question",
  "quiz.questionPlaceholder": "Which framework uses a state graph?",
  "quiz.optionsLegend": "Answer options",
  "quiz.optionsHint": "(2–8)",
  "quiz.correctHint": "Mark the one correct answer with the radio button.",
  "quiz.correctAria": "Mark option {number} as the correct answer",
  "quiz.optionAria": "Answer option {number}",
  "quiz.optionPlaceholder": "Option {number}",
  "quiz.removeOptionAria": "Remove option {number}",
  "quiz.addOption": "+ Add an option",
  "quiz.identifiableTitle": "Show voter names in results",
  "quiz.identifiableDetail":
    "Off by default. This choice cannot be changed after you launch the quiz.",
  "quiz.create": "Create quiz",
  "text.promptLabel": "Prompt",
  "text.promptPlaceholder":
    "What is the most actionable next step for your AI agent?",
  "text.criteriaLabel": "Ranking criterion",
  "text.criteriaPlaceholder":
    "Most actionable — specific, small, and possible this week.",
  "text.criteriaHint":
    "The AI judges every answer only against this criterion. It is locked when you launch.",
  "text.aiNotice":
    "Answers are sent to an AI model through the Vercel AI Gateway to be ranked. Ask for ideas, not sensitive personal information.",
  "text.identifiableTitle": "Show attendee names with answers",
  "text.identifiableDetail":
    "Off by default. This choice cannot be changed after you launch.",
  "text.create": "Create text prompt",
  "cloud.questionLabel": "Question",
  "cloud.questionPlaceholder":
    "What is one thing that would make your AI agent more useful next week?",
  "cloud.how":
    "Attendees submit one word or short phrase. Identical ideas grow on the big screen as more people submit them. No names are shown.",
  "cloud.create": "Create idea cloud",

  "activity.answerOptions": "Answer options",
  "activity.correctAnswer": "✓ Correct answer",
  "activity.resultsIdentifiable":
    "Results are identifiable — voter names will be shown to all results viewers.",
  "activity.resultsAnonymous":
    "Results are anonymous — voter identities will not appear in results.",
  "activity.textResultsIdentifiable":
    "Results are identifiable — attendee names will be shown with their answers.",
  "activity.textResultsAnonymous":
    "Results are anonymous — attendee identities will not appear in results.",
  "activity.correctHidden":
    "The correct answer is hidden from everyone until you close the quiz.",
  "activity.notOpen.poll":
    "The poll hasn't opened yet. Check back when the speaker launches it.",
  "activity.notOpen.quiz":
    "The quiz hasn't opened yet. Check back when the speaker launches it.",
  "activity.notOpen.text":
    "The text prompt hasn't opened yet. Check back when the speaker launches it.",
  "activity.notOpen.cloud":
    "The idea cloud hasn't opened yet. Check back when the speaker launches it.",
  "activity.rankedFor": "Ranked for: {criteria}",
  "activity.howItWorks": "How it works",
  "activity.textHow":
    "Attendees submit one short answer each. When you close, the AI ranks every answer against the criterion and the room sees the result immediately. You can also close without ranking and publish every answer in submission order.",
  "activity.textNoIdentity":
    "Answers are sent to the AI model without attendee identities.",
  "activity.cloudHow":
    "Attendees submit one word or short phrase each. When several people submit the same idea, it grows on the presenter screen and on the projected deck.",
  "activity.cloudAnonymous":
    "The cloud is anonymous — attendee names are never shown. Close the activity when the room has finished; the final cloud stays available to everyone with access.",

  "vote.legend": "Choose one answer",
  "vote.final": "Your vote is final and cannot be changed.",
  "vote.submitting": "Submitting…",
  "vote.submit": "Submit my vote",
  "text.answerLabel": "Your answer",
  "text.answerPlaceholder": "Write one concrete answer…",
  "text.charactersLeft": "{count} characters left",
  "text.answerFinal": "Your answer is final and cannot be changed.",
  "text.submitting": "Submitting…",
  "text.submit": "Submit my answer",
  "cloud.answerLabel": "Your idea",
  "cloud.answerPlaceholder": "One short idea, e.g. faster onboarding",
  "cloud.limits": "One word or short phrase · up to {count} words",
  "cloud.final": "Your idea is final and anonymous. No names are shown.",
  "cloud.send": "Send my idea",
  "cloud.sending": "Sending…",

  "results.attendeeView": "Attendee view",
  "results.projectorView": "Projector view",
  "results.accessRevoked": "You no longer have access to these results.",
  "results.unavailable":
    "Results are temporarily unavailable. Refresh to try again.",
  "results.response.one": "{count} response",
  "results.response.other": "{count} responses",
  "results.answeredCount.one": "{answered}/{attendees} attendees have answered",
  "results.answeredCount.other":
    "{answered}/{attendees} attendees have answered",
  "results.resultsAnonymous": "Results are anonymous.",
  "results.autoUpdate": "Results update automatically as votes arrive.",
  "results.quizVoteFirst":
    "Vote on the quiz first. Results are revealed after you answer.",
  "results.votingOpen": "Voting is open.",
  "results.quizWaiting":
    "Percentages, the number of responses, and the correct answer will be revealed when the quiz closes.",
  "results.noResponses": "No responses yet.",
  "results.correctCount": "{correct} of {total} got it right ({percent}%)",
  "results.yourPick": "Your pick",
  "results.youGotItRight": "You got it right.",
  "results.yourPickWrong":
    "Your pick was not correct. The correct answer is {answer}.",
  "results.highlightedOption": "the highlighted option",
  "results.lastRankingFailed": "The last ranking attempt failed.",
  "results.answersComing": "Answers are still coming in.",
  "results.retryOrPublish": "The presenter can retry or publish every answer.",
  "results.appearWhenClosed":
    "Results appear here when the presenter closes the activity.",
  "results.rankingAnswers": "Ranking the answers…",
  "results.appearWhenModel":
    "The results will appear as soon as the model finishes.",
  "results.publishedUnranked": "Published without AI ranking.",
  "results.allFiltered": "Every answer was filtered out as off-topic or spam.",
  "results.omitted.one": "{count} off-topic answer was omitted.",
  "results.omitted.other": "{count} off-topic answers were omitted.",
  "results.omittedTitle": "Omitted answers (presenter only)",
  "results.identifiableProjector":
    "Results are identifiable. Names are hidden on the projector.",
  "results.identifiable":
    "Results are identifiable. Attendee names appear next to their answers.",
  "results.rankedWith": "Ranked with {model}.",
  "results.configuredModel": "the configured model",
  "results.ideas": "{total} ideas · {unique} unique",
  "results.ideaOne": "{total} idea · {unique} unique",
  "results.ideaIn": "Your idea is in.",
  "results.watchBigScreen":
    "Watch the big screen as more ideas arrive. The final cloud will appear here when the presenter closes the activity.",
  "results.noIdeas": "No ideas were submitted.",
  "results.waitingFirstIdea":
    "Waiting for the first idea. It will appear here as soon as someone submits one.",
  "results.cloudAria": "Idea cloud. Repeated ideas appear larger.",
  "results.mentions.one": "— {count} mention",
  "results.mentions.other": "— {count} mentions",
  "results.moreIdeas": "+{count} more ideas not shown.",
  "results.oneMoreIdea": "+{count} more idea not shown.",
  "results.repeatedBigger":
    "Repeated ideas appear bigger. Ideas are anonymous — no names are shown.",
  "text.answerRemoved": "[answer removed]",
  "text.controls.retryRanking": "Retry ranking",
  "text.controls.rankClose": "Rank & close",
  "text.controls.ranking": "Ranking…",
  "text.controls.closeNoRank": "Close without ranking…",
  "text.controls.closing": "Closing…",
  "text.controls.answerCount.one": "{count} answer",
  "text.controls.answerCount.other": "{count} answers",
  "text.controls.overCap":
    "{count} answers is above the {limit}-answer limit for AI ranking. Close without ranking to publish them all.",
  "text.controls.noAnswers":
    "No answers yet. Ranking starts after at least one attendee answers.",
  "text.controls.rankingProgress":
    "Ranking is in progress. You can publish every answer if it fails or times out.",
  "text.controls.retryPrompt":
    "Retry ranking the {count} answers? The room will see the result as soon as the model finishes.",
  "text.controls.rankPrompt":
    "Rank the {count} answers and close? No more answers will be accepted, and the room will see the result as soon as the model finishes.",
  "text.controls.unrankedPrompt":
    "Close without ranking? All {count} answers will be published in submission order, with no AI ranking.",
  "text.controls.yesRank": "Yes, rank and close",
  "text.controls.yesUnranked": "Yes, close without ranking",
  "text.controls.failed": "Could not update the activity.",

  "roster.title": "Attendees & access",
  "roster.subtitle":
    "{name} — invited users always have access; a public talk can also admit anonymous guests.",
  "roster.publicOpen": "Public talk · joining open",
  "roster.publicClosed": "Public talk · joining closed",
  "roster.private": "Private talk · invited users only",
  "roster.addAttendees": "Add attendees",
  "roster.privacySettings": "Privacy settings",
  "roster.noAccess": "You no longer have access to this talk.",
  "roster.filter": "Filter roster",
  "roster.filter.all": "All",
  "roster.filter.attendee": "Attendees",
  "roster.filter.guest": "Guests",
  "roster.showing.one": "Showing {visible} of {total} person",
  "roster.showing.other": "Showing {visible} of {total} people",
  "roster.empty.all":
    "No one has access yet. Add invited attendees with the add user icon, or make the talk public to let guests join.",
  "roster.empty.attendee":
    "No invited attendees yet. Add them with the add user icon.",
  "roster.empty.guest":
    "No guests have joined this talk. Guests appear here while the talk is public and joining is open.",
  "roster.chip.attendee": "Attendee",
  "roster.chip.guest": "Guest",
  "roster.added": "added {date}",
  "roster.joined": "joined {date}",
  "roster.emailVerified": " · email verified",
  "roster.emailNotVerified": " · email not verified",
  "roster.removing": "Removing…",
  "roster.removeGuestAria": "Remove {name}",
  "roster.removeGuestConfirm":
    "Remove {name} from this talk? Their votes and answers are deleted and their browser stops working for this talk. If anonymous joining is still open, they could return under a different name. This cannot be undone.",
  "roster.yesRemoveGuest": "Yes, remove guest",
  "roster.addDialog": "Add attendees",
  "roster.privacyDialog": "Privacy & joining",
  "roster.inviteTitle": "Invite by email",
  "roster.inviteDetail":
    "Invited users always have access to this talk, even when it is private.",
  "roster.emailsPlaceholder":
    "one@email.com, another@email.com\none per line also works",
  "roster.emailsAria": "Email addresses",
  "roster.previewValid.one": "{count} valid address will be added",
  "roster.previewValid.other": "{count} valid addresses will be added",
  "roster.previewDuplicates.one": ", {count} duplicate ignored",
  "roster.previewDuplicates.other": ", {count} duplicates ignored",
  "roster.couldntRead": "Couldn't read: {list}",
  "roster.addAddresses": "Add addresses",
  "roster.adding": "Adding…",
  "roster.importCsv": "Import CSV",
  "roster.importHint":
    'First column is used, or the column headed "email". 1 MB limit.',
  "roster.csvAria": "CSV file",
  "roster.importing": "Importing…",
  "roster.csvTooLarge": "That CSV is too large (1 MB limit).",
  "roster.preview":
    "Preview: {valid} valid addresses will be added{duplicates}.",
  "roster.duplicateAddresses": "Duplicate addresses: {list}",
  "roster.summary.added.one": "Added {count} address.",
  "roster.summary.added.other": "Added {count} addresses.",
  "roster.summary.inviteFailed":
    "Added to the roster, but couldn't send an invite to: {list}",
  "roster.summary.alreadyPresent": "Already on the roster: {list}",
  "roster.summary.duplicates": "Ignored duplicates: {list}",

  "qr.presenterView": "Presenter view",
  "qr.projectorView": "Projector view",
  "qr.scan": "Scan to join the talk",
  "qr.closedDetail":
    "New anonymous attendees are not being admitted right now.",
  "qr.guestJoined.one": "1 guest has joined.",
  "qr.guestJoined.other": "{count} guests have joined.",

  "slides.title": "Slides",
  "slides.subtitle":
    "{name} — one PDF per talk, kept private to its rostered attendees.",
  "slides.currentPdf": "Current PDF uploaded {date}.",
  "slides.noPdf": "No PDF uploaded yet.",
  "slides.deckPlan": "Deck plan",
  "slides.deckPlanHint":
    "Drop an activity between two pages. The deck stops on it when you present, and you launch it from there.",
  "slides.uploadHint":
    "Upload the deck with the upload icon above, then plan the activities that sit between its slides.",
  "slides.upload": "Upload slides",
  "slides.present": "Present",
  "slides.remote": "Remote",
  "slides.slidesPdf": "Slides PDF",
  "slides.presentIntro":
    "Open Present on the laptop connected to the big screen, then use the remote on your phone.",
  "slides.openPresent": "Open Present ↗",
  "slides.openRemoteInstead": "Open Remote instead",
  "slides.remoteIntro":
    "Open this on the phone in your hand, signed in as the same account. The remote moves the deck and launches or closes the activity the deck is sitting on.",
  "slides.openRemote": "Open Remote",
  "slides.uploadFirst":
    "Upload the talk's PDF first. The deck is what Present projects and what the remote moves.",
  "slides.currentSlides":
    "Current slides uploaded {date}. Uploading again replaces the file attendees download and clears every activity placed in the deck plan.",
  "slides.noneUploaded":
    "No slides uploaded yet. Attendees see a download button once a PDF is uploaded.",
  "slides.preparing": "Preparing…",
  "slides.uploading": "Uploading…",
  "slides.finishing": "Finishing…",
  "slides.replace": "Replace slides",
  "slides.pdfLimit": "PDF only, up to {max} MB.",
  "slides.uploaded":
    "Slides uploaded. Rostered attendees can download them now.",
  "slides.choosePdf": "Choose a PDF file to upload.",
  "slides.removeConfirm":
    "Remove the PDF, clear the deck plan, and stop the download for attendees?",
  "slides.removing": "Removing…",
  "slides.yesRemove": "Yes, remove",
  "slides.removeSlides": "Remove slides",
  "slides.removed": "Slides removed.",
  "deck.loadFailed":
    "The deck could not be loaded, so it cannot be planned right now.",
  "deck.loading": "Loading the deck…",
  "deck.readyToPlace": "Ready to place",
  "deck.noReady":
    "No ready activity to place. New activities start ready; a live or closed one cannot be added.",
  "deck.dropHere": "Drop here to take it out",
  "deck.slideAria": "Slide {number}",
  "deck.save": "Save plan",
  "deck.saving": "Saving…",
  "deck.nonePlaced": "No activities placed.",
  "deck.placed.one": "{count} placed.",
  "deck.placed.other": "{count} placed.",
  "deck.saved": "Saved.",
  "deck.dragHint": "Drag an activity into a gap, or tap it and then tap a gap.",

  "present.signInTitle": "Sign in again",
  "present.signInDetail":
    "Your session ended, so the deck stopped following the talk.",
  "present.signIn": "Sign in",
  "present.noAccessTitle": "You no longer have access",
  "present.noAccessDetail":
    "This talk changed hands or your role changed while it was open.",
  "present.backToTalks": "Back to talks",
  "present.missingTitle": "This talk no longer exists",
  "present.missingDetail": "It may have been deleted while the deck was open.",
  "present.noSlidesTitle": "No slides uploaded yet",
  "present.noSlidesDetail":
    "Upload the talk's PDF in the Slides tab, then open Present again.",
  "present.openSlides": "Open Slides",
  "present.loadingSlides": "Loading slides…",
  "present.slidesError": "Couldn't load the slides — retrying",
  "present.fullscreen": "Full screen",
  "present.exitFullscreen": "Exit full screen",
  "present.slidesUnavailable": "Slides unavailable",
  "present.reconnecting": "Reconnecting",
  "remote.position": "Activity after {slide}",
  "remote.sessionEnded": "Your session ended. Sign in again.",
  "remote.noAccess": "You no longer have access to this talk.",
  "remote.missing": "This talk no longer exists.",
  "remote.reconnecting": "Reconnecting",
  "remote.previousSlide": "Previous slide",
  "remote.nextSlide": "Next slide",
  "remote.back": "Back",
  "remote.forward": "Next",
  "remote.launching": "Launching…",
  "remote.ranking": "Ranking…",
  "remote.closing": "Closing…",
  "remote.rankingProgress":
    "Ranking in progress — retry from the big screen if it fails.",
  "remote.rankingInProgress": "Ranking in progress",
  "remote.isLive": "{type} is live",
  "remote.noSlides": "No slides uploaded yet",
  "remote.backToTalk": "Back to talk",
  "remote.close.poll": "Close voting",
  "remote.close.quiz": "Close quiz",
  "remote.close.text": "Rank & close",
  "remote.close.cloud": "Close idea cloud",
  "activityStep.stillLoading":
    "The activity is still loading. It will retry on its own.",
  "activityStep.loading": "Loading the activity…",
  "activityStep.waitingLaunch": "Waiting to launch",
  "activityStep.cloudWaiting":
    "Attendees will submit one word or short phrase each. Repeated ideas grow on the screen.",
  "activityStep.next": "Next →",
  "activityStep.retryRanking": "Retry ranking",
  "activityStep.retrying": "Retrying…",

  "admin.title": "Manage users",
  "admin.subtitle":
    "Search and filter users, assign roles, and remove accounts that no longer need access.",
  "users.title": "Users",
  "users.count.one": "{count} user",
  "users.count.other": "{count} users",
  "users.add": "+ Add user",
  "users.filterEmail": "Filter by email",
  "users.filterRole": "Filter by role",
  "users.showing.one": "Showing {visible} of {total} user",
  "users.showing.other": "Showing {visible} of {total} users",
  "users.showingFiltered": " matching the filters",
  "users.clearFilters": "Clear filters",
  "users.none": "No provisioned users yet.",
  "users.noneMatch": "No users match these filters.",
  "users.table.user": "User",
  "users.table.role": "Role",
  "users.table.delete": "Delete",
  "users.emailVerified": "✓ Email verified",
  "users.emailNotVerified": "⌛ Email not verified",
  "users.roleLabel": "Role",
  "users.yourRole": "Your role",
  "users.roleAria": "Role for {email}",
  "users.saving": "Saving…",
  "users.deleteAria": "Delete {email}",
  "users.deleteConfirm":
    "Delete {email}? They lose access immediately, are removed from talk rosters, and their poll and quiz votes are deleted. Text answers are kept in place but replaced with a removal notice, so published rankings do not change. Talks they created stay in the library, without an owner. This cannot be undone.",
  "users.deleting": "Deleting…",
  "users.yesDelete": "Yes, delete user",
  "users.addTitle": "Add a user",
  "users.addDetail": "They get a sign-in link by email.",
  "users.email": "Email",
  "users.emailPlaceholder": "name@example.com",
  "users.adminNotice": "Admins can manage every user and talk.",
  "users.adding": "Adding…",
  "users.addUser": "Add user",
  "users.addedNotice": "User added. They can sign in using this email address.",
  "users.clearEmailFilter": "Clear email filter",
  "users.thisUser": "this user",

  "privacy.publicTitle": "Public talk",
  "privacy.publicDetailOn":
    "Anonymous people with the join link can enter a username and take part.",
  "privacy.publicDetailOff": "Only invited users can access this talk.",
  "privacy.makePrivate": "Make private",
  "privacy.makePublic": "Make public",
  "privacy.anonymousTitle": "Anonymous joining",
  "privacy.anonymousOpen":
    "New guests can join. People already in the room stay.",
  "privacy.anonymousClosed":
    "New guests are turned away. People already in the room stay.",
  "privacy.closeJoining": "Close joining",
  "privacy.openJoining": "Open joining",
  "privacy.joinLink": "Join link",

  "errors.auth.invalidEmail": "Enter a valid email address.",
  "errors.auth.signedOut": "You need to sign in.",
  "errors.auth.adminOnly": "Only the admin can do this.",
  "errors.auth.presenterOnly": "Only a presenter or admin can do this.",
  "errors.auth.invalidRole": "Choose a valid role.",
  "errors.talk.notAvailable": "This talk is not available.",
  "errors.talk.joinClosed": "Joining for this talk is closed.",
  "errors.talk.usernameTaken": "That username is already taken in this talk.",
  "errors.talk.noAccess": "You don't have access to this talk.",
  "errors.talk.cannotManage": "You can't manage this talk.",
  "errors.talk.publicRequired": "Make the talk public first.",
  "errors.talk.guestGone": "That guest is no longer in this talk.",
  "errors.talk.notFound": "Talk not found.",
  "errors.talk.nameLength": "Give the talk a name (1–200 characters).",
  "errors.talk.invalidDate": "That date could not be read.",
  "errors.guest.nameLength":
    "Choose a name between {min} and {max} characters.",
  "errors.guest.nameCharacters":
    "Use letters, numbers, spaces, dots, underscores, or hyphens, starting and ending with a letter or number.",
  "errors.activity.notFound": "Activity not found or you don't have access.",
  "errors.activity.alreadyLaunched":
    "This activity has already been launched or closed.",
  "errors.activity.anotherLive":
    "Another activity is already live for this talk.",
  "errors.activity.notActive": "This activity is not active.",
  "errors.activity.updateFailed": "Could not update the activity.",
  "errors.poll.noAccess": "You don't have access to this poll.",
  "errors.poll.notOpen": "This poll is not open for voting.",
  "errors.poll.voteRejected": "This vote was not accepted.",
  "errors.poll.alreadyVoted": "You have already voted in this poll.",
  "errors.poll.questionRequired": "A poll needs a question.",
  "errors.poll.minOptions": "A poll needs at least 2 answer options.",
  "errors.poll.maxOptions": "A poll can have at most 8 answer options.",
  "errors.poll.emptyOption": "Answer options cannot be empty.",
  "errors.quiz.noAccess": "You don't have access to this quiz.",
  "errors.quiz.notOpen": "This quiz is not open for voting.",
  "errors.quiz.voteRejected": "This vote was not accepted.",
  "errors.quiz.alreadyVoted": "You have already voted in this quiz.",
  "errors.quiz.questionRequired": "A quiz needs a question.",
  "errors.quiz.minOptions": "A quiz needs at least 2 answer options.",
  "errors.quiz.maxOptions": "A quiz can have at most 8 answer options.",
  "errors.quiz.emptyOption": "Answer options cannot be empty.",
  "errors.quiz.duplicateOption": "Answer options must be unique.",
  "errors.quiz.correctRequired": "Choose the correct answer.",
  "errors.text.noAccess": "You don't have access to this activity.",
  "errors.text.notAccepting": "This activity is not accepting answers.",
  "errors.text.alreadyAnswered": "You have already answered this activity.",
  "errors.text.notFound": "Activity not found or you don't have access.",
  "errors.text.cannotRank": "This activity can no longer be ranked.",
  "errors.text.noAnswers": "There are no answers to rank.",
  "errors.text.tooManyAnswers":
    "Too many answers to rank ({count}). Publish all answers instead.",
  "errors.text.rankingRunning": "Ranking is already running.",
  "errors.text.rankingFailed": "Ranking failed. Retry or publish all answers.",
  "errors.text.rankingNotStored": "Ranking could not be stored.",
  "errors.text.rankingNotSaved":
    "Ranking could not be saved. Retry or publish all answers.",
  "errors.text.cannotClose": "This activity can no longer be closed.",
  "errors.text.rankingStillRunning":
    "Ranking is still running. Wait for it to finish or time out.",
  "errors.text.rankingTimedOut": "Ranking timed out.",
  "errors.text.promptRequired": "A text prompt needs a question.",
  "errors.text.criterionRequired": "Add a criterion for ranking the answers.",
  "errors.text.answerRequired": "Write an answer first.",
  "errors.text.answerTooLong": "Answers can be at most {max} characters.",
  "errors.cloud.noAccess": "You don't have access to this activity.",
  "errors.cloud.notAccepting": "This idea cloud is not accepting ideas.",
  "errors.cloud.alreadySubmitted": "You have already submitted an idea.",
  "errors.cloud.promptRequired": "An idea cloud needs a question.",
  "errors.cloud.ideaRequired": "Write an idea first.",
  "errors.cloud.ideaTooLong": "Ideas can be at most {max} characters.",
  "errors.cloud.ideaTooManyWords": "Keep each idea to {max} words or fewer.",
  "errors.slides.choosePdf": "Choose a PDF file to upload.",
  "errors.slides.verifyFailed": "Could not verify the uploaded slides.",
  "errors.slides.uploadIncomplete":
    "The upload did not complete. Please try again.",
  "errors.slides.removeFailed": "Could not remove the slides. Try again.",
  "errors.slides.invalidPdf": "Slides must be a PDF file.",
  "errors.slides.tooLarge": "Slides file is larger than {maxMb} MB.",
  "errors.slides.empty": "Slides file is empty.",
  "errors.slides.invalidFile": "Slides must be a valid PDF file.",
  "errors.slides.prepareFailed":
    "Could not prepare the upload. Please try again.",
  "errors.slides.uploadFailed":
    "Upload failed — please check your connection and try again.",
  "errors.slides.uploadFailedRetry": "Upload failed — please try again.",
  "errors.slides.notAvailable": "Slides are not available right now.",
  "errors.deck.pageCountInvalid": "That deck's page count is not valid.",
  "errors.deck.duplicateActivity": "Each activity can only be placed once.",
  "errors.deck.betweenPages":
    "Every activity must sit between two pages of the deck.",
  "errors.deck.activityNotInTalk": "That activity is not part of this talk.",
  "errors.deck.notReady": "Only ready activities can be placed in the deck.",
  "errors.roster.chooseCsv": "Please choose a CSV file.",
  "errors.roster.csvTooLarge": "That CSV is too large (1 MB limit).",
  "errors.roster.accountCreateFailed":
    "Could not create an account for {email}.",
  "errors.roster.removeFailed": "Could not remove the address.",
  "errors.roster.removeGuestFailed": "Could not remove that guest.",
  "errors.users.createFailed":
    "Could not create or find the account for that email.",
  "errors.users.alreadyPrivileged":
    "That email already has a presenter or admin role.",
  "errors.users.notFound": "That user could not be found.",
  "errors.users.cannotDeleteSelf": "You can't delete your own account.",
  "errors.users.lastAdmin":
    "At least one admin must remain. Promote another user first.",
  "errors.users.deleteFailed": "Could not delete that user.",
  "errors.users.roleUpdateFailed": "Could not update that user's role.",
  "errors.slides.signInToControl": "Sign in to control this talk.",
  "errors.slides.cannotControl": "You can't control this talk.",
  "errors.generic.save": "That change could not be saved.",
  "errors.generic.retry": "That did not work. Try again.",
  "errors.generic.update": "Could not update the activity.",
  "errors.generic.delete": "Could not delete the talk.",
  "warnings.user.inviteFailed":
    "User added, but we couldn't send the verification invitation.",

  "notFound.title": "Page not found",
  "notFound.detail": "The page you are looking for does not exist.",
  "notFound.back": "Back to talks",
  "errorPage.title": "Something went wrong",
  "errorPage.detail": "The page could not be rendered. Try again.",
  "errorPage.retry": "Try again",
} satisfies Record<string, string>;

export type MessageKey = keyof typeof en;
export type ErrorKey = Extract<MessageKey, `errors.${string}`>;
export type WarningKey = Extract<MessageKey, `warnings.${string}`>;
export type MessageParams = Record<string, string | number>;
