/**
 * Created by jstenger on 08.08.2016.
 */
var app = angular.module("todo", ['ngAnimate', 'ngSanitize', 'ngRoute', 'ui.bootstrap']);

// Initialize Firebase
var config = {
    apiKey: "AIzaSyBq03qM_RMDydH38eW42cL_KfYFQE8bNOo",
    authDomain: "simple-todo-app-ng.firebaseapp.com",
    databaseURL: "https://simple-todo-app-ng.firebaseio.com",
    projectId: "simple-todo-app-ng",
    storageBucket: "",
    messagingSenderId: "1026888360899"
};
firebase.initializeApp(config);

app.config(function ($routeProvider) {
    $routeProvider
        .when("/", {
            templateUrl: "listView.html"
        })
        .when("/detail/:id", {
            templateUrl: "detailView.html"
        })
});

window.db = {};

app.controller("Controller", function Controller($scope, $uibModal, $location) {
    $scope.params = {};
    $scope.items = [];
    $scope.editingId = {};
    $scope.tempTitle = {};
    $scope.u = {};

    initAuthedDB($scope);

    $scope.showEditForm = function (id, $event) {
        $event.stopPropagation();
        var m = $uibModal.open({
            templateUrl: 'editModal.html',
            backdrop: "static",
            controller: function ($scope, id) {
                $scope.params = {};
                window.onbeforeunload = function () {
                    return "An edit is still in progress! Do you really want to leave?";
                };

                window.db.child(id).once('value').then(function (doc) {
                    doc = doc.val();
                    $scope.tempTitle = doc.title;
                    $scope.tempDetails = doc.details;
                    $scope.params.editText = doc.title;
                    $scope.params.editDetailText = doc.details;
                });

                $scope.cancelEdit = function () {
                    window.onbeforeunload = null;
                    /*db.child(id).once('value').then(function (doc) {
                        doc = doc.val();
                        doc.title = $scope.tempTitle;
                        doc.details = $scope.tempDetails;
                        db.child(id).set(doc);
                    });*/
                    m.close();
                };

                $scope.finalizeEdit = function () {
                    if ($scope.params.editText) {
                        window.onbeforeunload = null;
                        window.db.child(id).once('value').then(function (doc) {
                            doc = doc.val();
                            doc.title = $scope.params.editText;
                            doc.details = $scope.params.editDetailText;
                            window.db.child(id).set(doc);
                            m.close();
                        });
                    }
                };

                $scope.enterPressed = function ($event) {
                    if ($event.which === 13) {
                        $scope.finalizeEdit();
                    }
                };
            },
            resolve: {
                id: function () {
                    return id;
                }
            },
            keyboard: false
        });
    };

    $scope.sendNewTodo = function () {
        if ($scope.params.text) {
            var todo = {};
            var id = window.db.push().key;
            todo[window.db.push().key] = {
                _id: (new Date().toISOString()),
                title: $scope.params.text,
                completed: false,
                details: $scope.params.detailText || "",
                id: db.push().key
            };
            window.db.update(todo);
            $scope.params.text = "";
            $scope.params.detailText = "";
        }
    };

    $scope.sendCheckEdit = function (id) {
        window.db.child(id).once('value').then(function (doc) {
            doc = doc.val();
            doc.completed = !doc.completed;
            window.db.child(id).set(doc);
        });
    };

    $scope.removeTodo = function (id, $event) {
        $event.stopPropagation();
        window.db.child(id).once('value').then(function (doc) {
            doc = doc.val();
            if ($scope.editingId === id) return;
            window.db.child(id).remove();
        });
    };

    $scope.keyPressed = function ($event) {
        if ($event.which === 13) {
            $scope.sendNewTodo();
        }
    };

    $scope.goToDetail = function (id, $event) {
        $event.stopPropagation();
        $location.path('detail/' + id);
    };

    $scope.login = function () {
        firebase.auth().signInWithEmailAndPassword($scope.usernameInput, $scope.passwordInput).catch(function (error) {
            alert('unable to auth');
        }).then(function () {
            $scope.usernameInput = '';
            $scope.passwordInput = '';
        });
    };

    $scope.signUp = function () {
        firebase.auth().createUserWithEmailAndPassword($scope.newUsernameInput, $scope.newPasswordInput).catch(function (error) {
            alert('unable to auth');
        }).then(function () {
            $scope.newUsernameInput = '';
            $scope.newPasswordInput = '';
        });
    };

    $scope.logout = function () {
        firebase.auth().signOut();
    };

    $scope.displayLogin = false;
});

app.controller("DetailController", function DetailController($scope, $routeParams, $location) {
    $scope.currentItem = {};
    initAuthedDB($scope, function () {
        window.db.child($routeParams.id).on('value', function (doc) {
            doc = doc.val();
            $scope.currentItem.title = doc.title;
            $scope.currentItem.date = doc._id;
            $scope.currentItem.completed = doc.completed ? "completed" : "not completed";
            $scope.currentItem.details = doc.details;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
    });

    $scope.goBack = function () {
        $location.path('/');
    };
});

function initAuthedDB($scope, callback) {
    firebase.auth().onAuthStateChanged(function (user) {
        if (user && user.uid) {
            $scope.u = user.uid;
            window.db = firebase.database().ref("/" + user.uid);
            window.db.on('value', function (data) {
                data = data.val();
                var newItems = [];
                for (var key in data) {
                    if (!data.hasOwnProperty(key)) continue;
                    data[key].id = key;
                    /*var index = containsObject(data[key], $scope.items);
                console.log(index);*/
                    /*if (index) {
                    $scope.items[index - 1] = data[key];
                } else {
                    $scope.items.push(data[key]);
                }*/
                    newItems.push(data[key]);
                }
                $scope.items = newItems;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
            if (typeof callback === 'function') {
                callback();
            }
        } else {
            $scope.u = 0;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }
    });
}