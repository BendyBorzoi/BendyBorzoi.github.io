// Initialize Firebase
var config = {
    apiKey: "AIzaSyD3PsRLESYjg0Zwg_oeh6Hiw2lUdMpBvXc",
    authDomain: "llteams-c9bb3.firebaseapp.com",
    databaseURL: "https://llteams-c9bb3.firebaseio.com",
    projectId: "llteams-c9bb3",
    storageBucket: "llteams-c9bb3.appspot.com",
    messagingSenderId: "366184548398"
};
firebase.initializeApp(config);

var auth = firebase.auth();
ko.bindingHandlers.flash = {
    init: function (element) {
        $(element).hide();
    },
    update: function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (value) {
            $(element).stop().hide().text(value).fadeIn(function () {
                clearTimeout($(element).data("timeout"));
                $(element).data("timeout", setTimeout(function () {
                    $(element).fadeOut();
                    valueAccessor()(null);
                }, 3000));
            });
        }
    },
    timeout: null
};

var DraggablePlayer = function (id, tn, sn, rating, pos1, pos2) {
    this.id = id;
    this.tn = ko.observable(tn);
    this.sn = ko.observable(sn);
    this.rating = rating;
    if (typeof pos1 !== 'string') pos1 = 'F';
    if (typeof pos2 !== 'string') pos2 = 'F';
    if (pos1 === 'F' || pos1.slice(0, 1) === 'F') this.posString = '[F]';
    else this.posString = '[' + pos1.slice(0, 1) + ',' + pos2.slice(0, 1) + ']';
    this.displayTn = ko.computed(function () {
        return this.tn() + ' (' + this.rating + ') ' + this.posString;
    }, this);
    this.displaySn = ko.computed(function () {
        return this.sn() + ' (' + this.rating + ') ' + this.posString;
    }, this);
};

var SortableTeam = function (id, members) {
    this.members = ko.observableArray(members);
    this.members.id = id;
    this.rating = ko.observable();
    this.reset = function () {
        var names = [];
        this.members().forEach(function (item) {
            vm.available.push(item);
            names.push(item.tn());
        });
        var updates = {};
        updates['teams/Available'] = {};
        var i = 0;
        vm.available().forEach(function (item) {
            updates['teams/Available'][i] = typeof vm.available()[i] !== 'undefined' ? vm.available()[i].id : '';
            i++;
        }, this);
        updates['teams/' + this.members.id] = {};
        vm.lastAction("Reset " + this.members.id);
        var d = new Date();
        updates['log/' + d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + '/' + (-new Date().getTime())] = {
            user: vm.u().email,
            action: vm.lastAction(),
            team: names
        };
        // this.members([]);
        firebase.database().ref().update(updates);
    };
};

var teamsVM = function (tables, available, excused, awol, onLeave) {
    var self = this;
    this.loadComplete = ko.observable(false);
    this.email = ko.observable();
    this.password = ko.observable();
    this.newPassword = ko.observable();
    this.auth = function () {
        auth.signInWithEmailAndPassword(this.email(), this.password()).catch(function (error) {
            alert('unable to auth');
        });
    };
    this.logout = function () {
        auth.signOut();
    };
    this.changePassword = function () {
        auth.currentUser.updatePassword(this.newPassword()).then(function () {
            alert('changed password');
            vm.newPassword('');
        }, function (error) {
            alert('unable to change password');
        });
    };
    this.currentPage = ko.observable();
    this.loadCompleteUser = ko.observable(false);
    this.loadCompleteDB = ko.observable(false);
    this.loadComplete = ko.computed(function () {
        return this.loadCompleteDB() && this.loadCompleteUser();
    }, this);
    this.u = ko.observable();
    this.e = ko.computed(function () {
        return this.u() ? this.u().email : null
    }, this);
    this.moved = ko.observable();
    this.teams = ko.observableArray(tables);
    this.available = ko.observableArray(available);
    this.excused = ko.observableArray(excused);
    this.awol = ko.observableArray(awol);
    this.onLeave = ko.observableArray(onLeave);
    this.available.id = "Available";
    this.excused.id = "Excused";
    this.awol.id = "AWOL";
    this.onLeave.id = "On Leave";
    this.lastAction = ko.observable();
    this.lastError = ko.observable();
    this.maximumPlayers = 5;
    this.isTableFull = function (parent) {
        return parent().length < self.maximumPlayers;
    };

    this.editId = ko.observable('');
    this.snEdit = ko.observable();
    this.tnEdit = ko.observable();
    this.showEditDialog = ko.observable(false);
    this.position1Edit = ko.observableArray(['Fill', 'Top', 'Jungle', 'Mid', 'ADC', 'Support']);
    this.position2Edit = ko.observableArray(['Fill', 'Top', 'Jungle', 'Mid', 'ADC', 'Support']);
    this.position1EditVal = ko.observable();
    this.position2EditVal = ko.observable();
    this.submitEdit = function () {
        //TODO refetch sns
        var update;
        var xhttp = new XMLHttpRequest();

        if (self.moved() !== self.snEdit()) {
            xhttp.onreadystatechange = function () {
                if (this.readyState === 4 && this.status === 200) {
                    var res = JSON.parse(this.responseText);
                    update = {
                        sn: res.sn,
                        tn: self.tnEdit(),
                        position1: self.position1EditVal(),
                        position2: self.position2EditVal(),
                        id: res.id,
                        rank: res.tier + ' ' + res.division + ' ' + (res.lp !== '' ? res.lp + 'LP' : ''),
                        rating: -getRating(res.tier, res.division, res.lp)
                    };
                    firebase.database().ref('players/' + self.editId()).update(update);
                    self.showEditDialog(false);
                    self.tnEdit('');
                    self.position1EditVal('');
                    self.position2EditVal('');
                    self.editId('');
                    self.snEdit('');
                }
            };
            xhttp.open("GET", "admin/fetchInitialData.php?sn=" + self.snEdit() + "&uid=" + auth.currentUser.uid, true);
            xhttp.send();
        } else {
            update = {
                sn: self.snEdit(),
                tn: self.tnEdit(),
                position1: self.position1EditVal(),
                position2: self.position2EditVal()
            };
            firebase.database().ref('players/' + self.editId()).update(update);
            self.showEditDialog(false);
            self.tnEdit('');
            self.position1EditVal('');
            self.position2EditVal('');
            self.editId('');
            self.snEdit('');
        }
    };

    this.players = ko.observableArray([]);
    this.tn = ko.observable();
    this.sn = ko.observable();
    this.f = ko.observable(true);
    this.position1Val = ko.observable();
    this.position2Val = ko.observable();
    this.insertPlayer = function () {
        firebase.database().ref('players').push({
            tn: self.tn(),
            sn: self.sn(),
            position1: self.position1Val(),
            position2: self.position2Val()
        });

        /*vm.available.push(
         new DraggablePlayer(
         currentPlayer.pushId(),
         currentPlayer.tn(),
         currentPlayer.sn(),
         currentPlayer.rating(),
         currentPlayer.position1(),
         currentPlayer.position2()
         )
         );*/
        /*var update = {}, le = 0;
         firebase.database.ref('teams/Available').once('value').then(function (snap) {
         le = snap.length;
         update['teams/Available'] = snap;
         });*/

        var key;
        var length;
        var schnapp;
        firebase.database().ref('teams/Available').once('value', function (snap) {
            schnapp = snap.val();
            length = snap.val().length;
        });
        firebase.database().ref('players').orderByChild('tn').equalTo(self.tn()).once('child_added', function (snap) {
            schnapp[length] = snap.key;
            firebase.database().ref('teams/Available').set(schnapp);
            key = snap.key;
        });

        //firebase.database().ref().update(update);
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                var res = JSON.parse(this.responseText);
                firebase.database().ref('players/' + key).update({
                    sn: res.sn,
                    id: res.id,
                    rank: res.tier + ' ' + res.division + ' ' + (res.lp !== '' ? res.lp + 'LP' : ''),
                    rating: -getRating(res.tier, res.division, res.lp),
                    dateUpdated: new Date().getTime()
                });
            }
        };
        xhttp.open("GET", "admin/fetchInitialData.php?sn=" + self.sn() + "&uid=" + auth.currentUser.uid, true);
        xhttp.send();
        self.tn('');
        self.sn('');
        self.f(true);
    };

    this.updateLastAction = function (arg) {
        var updates = {};
        updates['teams/' + arg.targetParent.id] = {};
        updates['teams/' + arg.sourceParent.id] = {};
        var i = 0;
        arg.targetParent().forEach(function (item) {
            updates['teams/' + arg.targetParent.id][i] = typeof arg.targetParent()[i] !== 'undefined' ? arg.targetParent()[i].id : '';
            i++;
        });
        i = 0;
        arg.sourceParent().forEach(function (item) {
            updates['teams/' + arg.sourceParent.id][i] = typeof arg.sourceParent()[i] !== 'undefined' ? arg.sourceParent()[i].id : '';
            i++;
        });
        self.lastAction("Moved " + arg.item.tn() + " from " + arg.sourceParent.id + " to " + arg.targetParent.id);
        var d = new Date();
        updates['log/' + d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + '/' + (-new Date().getTime())] = {
            user: vm.u().email,
            action: vm.lastAction()
        };
        firebase.database().ref().update(updates);
    };

    this.verifyAssignments = function (arg) {
        vm.moved(arg.item.id);
    };
};

ko.bindingHandlers.modal = {
    init: function (element, valueAccessor) {
        $(element).modal({
            show: false
        });
        var value = valueAccessor();
        if (typeof value === 'function') {
            $(element).on('hide.bs.modal', function () {
                value(false);
            });
        }
    },
    update: function (element, valueAccessor) {
        var value = valueAccessor();
        if (ko.utils.unwrapObservable(value)) {
            $(element).modal('show');
        } else {
            $(element).modal('hide');
        }
    }
};

function clearOutput() {
    vm.players([]);
}

function Player(pushId, tn, sn, rank, id, rating, position1, position2) {
    this.pushId = ko.observable(pushId);
    this.tn = ko.observable(tn);
    this.sn = ko.observable(sn);
    this.rank = ko.observable(rank);
    this.id = ko.observable(id);
    this.rating = ko.observable(-rating);
    this.position1 = ko.observable(position1);
    this.position2 = ko.observable(position2);
    this.position = ko.computed(function () {
        return this.position1() + ', ' + this.position2()
    }, this);
    this.updatePlayer = function () {
        this.rank('loading ...');
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                var res = JSON.parse(this.responseText);
                firebase.database().ref('players/' + pushId).update({
                    sn: res.sn,
                    rank: res.tier + ' ' + res.division + ' ' + (res.lp !== '' ? res.lp + 'LP' : ''),
                    rating: -getRating(res.tier, res.division, res.lp),
                    dateUpdated: new Date().getTime()
                });
            }
        };
        xhttp.open("GET", "admin/fetchData.php?id=" + id + "&uid=" + auth.currentUser.uid, true);
        xhttp.send();
    };
    this.deletePlayer = function () {
        firebase.database().ref('players/' + pushId).remove();
    };
    this.showEditDialog = function () {
        vm.showEditDialog(true);
        vm.editId(this.pushId());
        vm.snEdit(this.sn());
        vm.moved(this.sn());
        vm.tnEdit(this.tn());
        vm.position1EditVal(this.position1());
        vm.position2EditVal(this.position2());
    };
}
function updateAllPlayers() {
    var idString = "";
    vm.players().forEach(function (item) {
        idString += '[' + item.pushId() + ' => ' + item.id() + ']&ids[]=';
    });
    if (idString.length > 0) {
        idString = idString.slice(0, idString.length - 7);
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                var res = JSON.parse(this.responseText);
                res.forEach(function (item) {
                    firebase.database().ref('players/' + item.uid).update({
                        sn: item.sn,
                        rank: item.tier + ' ' + item.division + ' ' + (item.lp !== '' ? item.lp + 'LP' : ''),
                        rating: -getRating(item.tier, item.division, item.lp),
                        dateUpdated: new Date().getTime()
                    });
                });
            }
        };
        xhttp.open("GET", "admin/fetchDataArray.php?id=" + idString + "&uid=" + auth.currentUser.uid, true);
        xhttp.send();
    } else {
        alert('no ids to fetch data for');
    }
}
function getRating(tier, division, lp) {
    var rating = 0;
    switch (tier) {
        case 'BRONZE':
            break;
        case 'SILVER':
            rating += 500;
            break;
        case 'GOLD':
            rating += 1000;
            break;
        case 'PLATINUM':
            rating += 1500;
            break;
        case 'DIAMOND':
            rating += 2000;
            break;
        case 'MASTER':
        case 'CHALLENGER':
            rating += 2500;
            break;
        case 'UNRANKED':
        default:
            rating += 500;
            break;
    }
    switch (division) {
        case 'I':
            rating += 400;
            break;
        case 'II':
            rating += 300;
            break;
        case 'III':
            rating += 200;
            break;
        case 'IV':
            rating += 100;
            break;
        case 'V':
        default:
            break;
    }
    rating += lp !== '' ? parseInt(lp) : 0;
    return rating;
}

var available = [], excused = [], awol = [], onLeave = [];

firebase.database().ref('players').orderByChild('dateUpdated').on('value', function (snap) {
    clearOutput();
    snap.forEach(function (item) {
        vm.players.push(new Player(
            item.key,
            item.val().tn,
            item.val().sn,
            item.val().rank,
            item.val().id,
            item.val().rating,
            item.val().position1,
            item.val().position2
        ));
    });
    firebase.database().ref('teams/').update({dateUpdated: new Date().getTime()});
    setTimeout(function () {
        vm.loadCompleteDB(true)
    }, 1000);
});

firebase.database().ref('teams').on('value', function (snap) {
    vm.teams()[0].members([]);
    vm.teams()[1].members([]);
    vm.teams()[2].members([]);
    vm.teams()[3].members([]);
    vm.teams()[4].members([]);
    vm.teams()[5].members([]);
    vm.available([]);
    vm.excused([]);
    vm.awol([]);
    vm.onLeave([]);
    var ratings = [0, 0, 0, 0, 0, 0];
    snap.forEach(function (item) {
        var t = item.key;
        var arr, i = false;
        switch (t) {
            case 'Excused':
                arr = vm.excused;
                break;
            case 'AWOL':
                arr = vm.awol;
                break;
            case 'Team One':
                arr = vm.teams()[0].members;
                i = 0;
                break;
            case 'Team Two':
                arr = vm.teams()[1].members;
                i = 1;
                break;
            case 'Team Three':
                arr = vm.teams()[2].members;
                i = 2;
                break;
            case 'Team Four':
                arr = vm.teams()[3].members;
                i = 3;
                break;
            case 'Team Five':
                arr = vm.teams()[4].members;
                i = 4;
                break;
            case 'Team Six':
                arr = vm.teams()[5].members;
                i = 5;
                break;
            case 'On Leave':
                arr = vm.onLeave;
                break;
            case 'Available':
            default:
                arr = vm.available;
                break;
        }
        var position = 0;
        while (position < item.val().length) {
            if (typeof item.val()[position] !== 'undefined') {
                var currentPlayer = vm.players().find(function (p) {
                    return p.pushId() === item.val()[position];
                });
            }
            if (typeof currentPlayer !== 'undefined') {
                if (i !== false) ratings[i] += parseInt(currentPlayer.rating());
                arr.push(
                    new DraggablePlayer(
                        currentPlayer.pushId(),
                        currentPlayer.tn(),
                        currentPlayer.sn(),
                        currentPlayer.rating(),
                        currentPlayer.position1(),
                        currentPlayer.position2()
                    )
                );
                currentPlayer = undefined;
            }
            position++;
        }
    });
    vm.teams()[0].rating(ratings[0]);
    vm.teams()[1].rating(ratings[1]);
    vm.teams()[2].rating(ratings[2]);
    vm.teams()[3].rating(ratings[3]);
    vm.teams()[4].rating(ratings[4]);
    vm.teams()[5].rating(ratings[5]);
});

var initialTables = [
    new SortableTeam("Team One", []),
    new SortableTeam("Team Two", []),
    new SortableTeam("Team Three", []),
    new SortableTeam("Team Four", []),
    new SortableTeam("Team Five", []),
    new SortableTeam("Team Six", [])
];

var vm = new teamsVM(initialTables, available, excused, awol, onLeave);

ko.bindingHandlers.sortable.beforeMove = vm.verifyAssignments;
ko.bindingHandlers.sortable.afterMove = vm.updateLastAction;

firebase.auth().onAuthStateChanged(function (firebaseUser) {
    vm.u(firebaseUser);
    setTimeout(function () {
        vm.loadCompleteUser(true)
    }, 1000);
});
ko.applyBindings(vm);
vm.currentPage('teams');