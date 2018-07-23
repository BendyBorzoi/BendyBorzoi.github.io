let audio = new Audio("sounds/smw_coin.wav"),
    audio2 = new Audio("sounds/stuffed-and-dropped.mp3"),
    cdGoal,
    timerInt,
    interval,
    interval2,
    msg;

function TimerViewModel() {
    let self = this;
    self.timerInputs1 = ko.observable(true);
    self.timerInputs2 = ko.computed(function () {
        return !self.timerInputs1();
    });
    self.timerNotStarted = ko.observable(true);
    self.timerInputMinutes = ko.observable();
    self.timerInputHour = ko.observable();
    self.timerInputMinute = ko.observable();
    self.timerMsg = ko.observable();
    self.timerText = ko.observable();
    self.timerTitle = ko.observable("Still Counting");
    self.timerString = ko.observable();
    self.init = function () {
        if (self.timerMsg()) {
            msg = self.timerMsg();
            self.timerText(msg);
        } else {
            msg = "timer is done"
        }
        onbeforeunload = function () {
            return "A timer is still running."
        };
        self.timerNotStarted(false);
        audio.play().then();
    };
    self.init1 = function () {
        cdGoal = moment().milliseconds(300).add(self.timerInputMinutes(), "minutes");
        self.init();
        self.tick();
        interval = setInterval(self.tick, 1000);
    };
    self.init21 = function () {
        cdGoal = moment().startOf('day').hours(self.timerInputHour()).minutes(self.timerInputMinute());
        self.init();
        interval2 = setInterval(self.init22, 20);
    };
    self.init22 = function () {
        let temp = moment().milliseconds();
        if (temp % 1000 > 300 && temp % 1000 < 700) {
            clearInterval(interval2);
            self.tick();
            interval = setInterval(self.tick, 1000);
        }
    };
    self.tick = function () {
        timerInt = cdGoal.diff(moment());
        if (timerInt > 0) {
            let timerString = moment().startOf("day").milliseconds(timerInt + 1000).format("HH:mm:ss");
            self.timerString(timerString);
            self.timerTitle(msg === "timer is done" ? timerString : timerString + ' ' + msg);
        } else {
            self.timerString(msg);
            self.timerTitle(msg);
            self.timerText("finished at " + moment().format("HH:mm:ss"));
            clearInterval(interval);
            onbeforeunload = null;
            audio2.play().then();
        }
    };
    self.switchType = function () {
        self.timerInputs1(!self.timerInputs1());
    };
}