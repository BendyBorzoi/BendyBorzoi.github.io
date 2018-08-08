let app = angular.module("todo", ['ngAnimate', 'ngSanitize', 'ngRoute', 'ui.bootstrap']);

app.config(function ($routeProvider) {
    $routeProvider
        .when("/", {
            templateUrl: "listView.html"
        })
        .when("/detail/:id", {
            templateUrl: "detailView.html"
        })
        .when("/about", {
            templateUrl: "about.html"
        });
});

app.run(function ($rootScope) {
    let config = {
        apiKey: "AIzaSyBq03qM_RMDydH38eW42cL_KfYFQE8bNOo",
        authDomain: "simple-todo-app-ng.firebaseapp.com",
        databaseURL: "https://simple-todo-app-ng.firebaseio.com",
        projectId: "simple-todo-app-ng",
        storageBucket: "",
        messagingSenderId: "1026888360899"
    };
    firebase.initializeApp(config);

    firebase.auth().onAuthStateChanged(function (user) {
        if (user && user.uid) {
            $rootScope.u = user.uid;
            $rootScope.db = firebase.database().ref("/" + user.uid);
        } else {
            $rootScope.u = 0;
        }
        if (!$rootScope.$$phase) {
            $rootScope.$apply();
        }
    });
});

app.controller("routeController", function ($scope) {
    $scope.nav = [
        {
            href: '#!/',
            name: 'Todo List'
        },
        {
            href: '#!/about',
            name: 'About'
        }
    ];

    $scope.login = function () {
        firebase.auth().signInWithEmailAndPassword($scope.usernameInput, $scope.passwordInput).catch(function (error) {
            alert(error.message);
        }).then(function () {
            $scope.usernameInput = '';
            $scope.passwordInput = '';
        });
    };

    $scope.logout = function () {
        firebase.auth().signOut();
    };
});

app.controller("Controller", function Controller($scope, $uibModal, $location, $rootScope) {
    $scope.params = {};
    $scope.items = [];
    $scope.editingId = {};

    firebase.auth().onAuthStateChanged(function (user) {
        if (user && user.uid) {
            $rootScope.db.on('value', function (data) {
                data = data.val();
                var newItems = [];
                for (var key in data) {
                    if (!data.hasOwnProperty(key)) continue;
                    data[key].id = key;
                    newItems.push(data[key]);
                }
                $scope.items = newItems;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        }
    });


    $scope.showEditForm = function (id, $event) {
        $event.stopPropagation();
        let m = $uibModal.open({
            templateUrl: 'editModal.html',
            backdrop: "static",
            controller: function ($scope, id, $rootScope) {
                $scope.params = {};
                window.onbeforeunload = function () {
                    return "An edit is still in progress! Do you really want to leave?";
                };

                $rootScope.db.child(id).once('value').then(function (doc) {
                    doc = doc.val();
                    $scope.tempTitle = doc.title;
                    $scope.tempDetails = doc.details;
                    $scope.params.editText = doc.title;
                    $scope.params.editDetailText = doc.details;
                });

                $scope.cancelEdit = function () {
                    window.onbeforeunload = null;
                    m.close();
                };

                $scope.finalizeEdit = function () {
                    if ($scope.params.editText) {
                        window.onbeforeunload = null;
                        $rootScope.db.child(id).once('value').then(function (doc) {
                            doc = doc.val();
                            doc.title = $scope.params.editText;
                            doc.details = $scope.params.editDetailText;
                            $rootScope.db.child(id).set(doc);
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
            let todo = {};
            let id = $rootScope.db.push().key;
            todo[id] = {
                _id: (new Date().toISOString()),
                title: $scope.params.text,
                completed: false,
                details: $scope.params.detailText || "",
                id: $rootScope.db.push().key
            };
            $scope.db.update(todo);
            $scope.params.text = "";
            $scope.params.detailText = "";
        }
    };

    $scope.sendCheckEdit = function (id) {
        $rootScope.db.child(id).once('value').then(function (doc) {
            doc = doc.val();
            doc.completed = !doc.completed;
            $scope.db.child(id).set(doc);
        });
    };

    $scope.removeTodo = function (id, $event) {
        $event.stopPropagation();
        $scope.db.child(id).once('value').then(function () {
            if ($scope.editingId === id) return;
            $rootScope.db.child(id).remove();
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
            alert(error.message);
        }).then(function () {
            $scope.usernameInput = '';
            $scope.passwordInput = '';
        });
    };

    $scope.signUp = function () {
        firebase.auth().createUserWithEmailAndPassword($scope.newUsernameInput, $scope.newPasswordInput).catch(function (error) {
            alert(error.message);
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

app.controller("DetailController", function DetailController($scope, $routeParams, $location, $rootScope) {
    $scope.currentItem = {};
    firebase.auth().onAuthStateChanged(function (user) {
        if (user && user.uid) {
            $rootScope.db.child($routeParams.id).on('value', function (doc) {
                doc = doc.val();
                $scope.currentItem.title = doc.title;
                $scope.currentItem.date = doc._id;
                $scope.currentItem.completed = doc.completed ? "completed" : "not completed";
                $scope.currentItem.details = doc.details;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            });
        }
    });

    $scope.goBack = function () {
        $location.path('/');
    };
});