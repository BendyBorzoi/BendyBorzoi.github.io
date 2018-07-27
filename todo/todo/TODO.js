/**
 * Created by jstenger on 08.08.2016.
 */
var todo = angular.module("todo", ['ngAnimate', 'ngSanitize', 'ngRoute', 'ui.bootstrap']);

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

todo.config(function ($routeProvider) {
    $routeProvider
        .when("/", {
            templateUrl: "listView.html"
        })
        .when("/detail/:id", {
            templateUrl: "detailView.html"
        })
});

todo.controller("Controller", function Controller($scope, $uibModal, $location) {
    $scope.params = {};
    $scope.items = [];
    $scope.editing = "hidden";
    $scope.editingId = {};
    $scope.tempTitle = {};
    $scope.u = {};
    $scope.db = {};

    firebase.auth().onAuthStateChanged(function (user) {
        $scope.u = user;
        $scope.db = firebase.database().ref("/"/*firebase.auth().currentUser.uid*/);
        $scope.db.on('value', function (data) {
            data = data.val();
            $scope.items = [];
            for (var key in data) {
                if (!data.hasOwnProperty(key)) continue;
                $scope.items.push(data[key]);
            }
            $scope.$apply();
        });
    });

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

                $scope.db.child(id).once('value').then(function (doc) {
                    doc = doc.val();
                    $scope.tempTitle = doc.title;
                    $scope.tempDetails = doc.details;
                    $scope.params.editText = doc.title;
                    $scope.params.editDetailText = doc.details;
                });

                $scope.cancelEdit = function () {
                    window.onbeforeunload = null;
                    $scope.db.child(id).once(value).then(function (doc) {
                        doc = doc.val();
                        doc.title = $scope.tempTitle;
                        doc.details = $scope.tempDetails;
                        db.child(id).set(doc);
                        m.close();
                    });
                };

                $scope.finalizeEdit = function () {
                    if ($scope.params.editText) {
                        window.onbeforeunload = null;
                        $scope.db.child(id).once('value').then(function (doc) {
                            doc = doc.val();
                            doc.title = $scope.params.editText;
                            doc.details = $scope.params.editDetailText;
                            db.child(id).set(doc);
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
            var id = $scope.db.push().key;
            todo[$scope.db.push().key] = {
                _id: (new Date().toISOString()),
                title: $scope.params.text,
                completed: false,
                details: $scope.params.detailText || "",
                id: $scope.db.push().key
            };
            $scope.db.update(todo);
            $scope.params.text = "";
            $scope.params.detailText = "";
        }
    };

    $scope.sendCheckEdit = function (id) {
        $scope.db.once('value').then(function (doc) {
            doc = doc.val();
            console.log(doc[id]);
            console.log(id);
            console.log(doc);
            doc[id].completed = !doc[id].completed;
            $scope.db.set(doc);
        });
    };

    $scope.removeTodo = function (id, $event) {
        $event.stopPropagation();
        $scope.db.child(id).once('value').then(function (doc) {
            doc = doc.val();
            if ($scope.editingId === id) return;
            $scope.db.child(id).remove();
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
});

todo.controller("DetailController", function DetailController($scope, $routeParams, $location) {
    $scope.currentItem = {};
    $scope.db = firebase.database().ref("/");
    $scope.db.child($routeParams.id).once('value').then(function (doc) {
        doc = doc.val();
        $scope.currentItem.title = doc.title;
        $scope.currentItem.date = doc.title; //TODO
        $scope.currentItem.completed = doc.completed ? "completed" : "not completed";
        $scope.currentItem.details = doc.details;
        $scope.$apply();
    });

    $scope.goBack = function () {
        $location.path('/');
    }
});