/**
 * Created by jstenger on 08.08.2016.
 */
var todo = angular.module("todo", ['ngAnimate', 'ngSanitize', 'ngRoute', 'ui.bootstrap']);

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

    var db = new PouchDB('todoDB');

    $scope.showEditForm = function (id, $event) {
        $event.stopPropagation();
        var m = $uibModal.open({
            templateUrl: 'editModal.html',
            backdrop: "static",
            controller: function ($scope, id) {
                var db = new PouchDB('todoDB');
                $scope.params = {};
                window.onbeforeunload = function () {
                    return "An edit is still in progress! Do you really want to leave?";
                };
                db.get(id).then(function (doc) {
                    $scope.tempTitle = doc.title;
                    $scope.tempDetails = doc.details;
                    $scope.params.editText = doc.title;
                    $scope.params.editDetailText = doc.details;
                });

                $scope.cancelEdit = function () {
                    window.onbeforeunload = "";
                    db.get(id).then(function (doc) {
                        doc.title = $scope.tempTitle;
                        doc.details = $scope.tempDetails;
                        db.put(doc);
                        refreshListView();
                        m.close();
                    });
                };

                $scope.finalizeEdit = function () {
                    if ($scope.params.editText) {
                        window.onbeforeunload = "";
                        db.get(id).then(function (doc) {
                            doc.title = $scope.params.editText;
                            doc.details = $scope.params.editDetailText;
                            db.put(doc);
                            refreshListView();
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

    function refreshListView() {

        $scope.items = [];

        db.allDocs({include_docs: true, descending: true}, function (err, doc) {
            doc.rows.forEach(function (row) {
                $scope.items.push({
                    id: row.id,
                    text: row.doc.title,
                    checked: row.doc.completed,
                    details: row.doc.details
                });
            });
            $scope.$apply();
        });
    }

    refreshListView();

    $scope.sendNewTodo = function () {
        if ($scope.params.text) {
            var todo = {
                _id: new Date().toISOString(),
                title: $scope.params.text,
                completed: false,
                details: $scope.params.detailText
            };
            db.put(todo);
            $scope.params.text = "";
            $scope.params.detailText = "";
            refreshListView();
        }
    };

    $scope.sendCheckEdit = function (id) {
        db.get(id).then(function (doc) {
            doc.completed = !doc.completed;
            db.put(doc);
            refreshListView();
        });
    };

    $scope.removeTodo = function (id, $event) {
        $event.stopPropagation();
        db.get(id).then(function (doc) {
            if ($scope.editingId === id) return;
            db.remove(doc);
            refreshListView();
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
    var db = new PouchDB('todoDB');
    $scope.currentItem = {};
    db.get($routeParams.id).then(function (doc) {
        $scope.currentItem.title = doc.title;
        $scope.currentItem.date = doc._id;
        $scope.currentItem.completed = doc.completed ? "completed" : "not completed";
        $scope.currentItem.details = doc.details;
        $scope.$apply();
    });

    $scope.goBack = function () {
        $location.path('/');
    }
});