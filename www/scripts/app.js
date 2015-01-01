'use strict';
// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'

var db = window.openDatabase("TodoDevDB", "1.0", "Todo Dev Database", 10000); //Dev to work in webview

angular.module('App1', ['ionic', 'config', 'ngCordova'])

.run(function($ionicPlatform, $cordovaSQLite, Projects) {
    $ionicPlatform.ready(function() {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
            // org.apache.cordova.statusbar required
            StatusBar.styleDefault();
        }


        $cordovaSQLite.execute(db, "CREATE TABLE IF NOT EXISTS bills(id integer primary key, name string, payed boolean, checkdate date)");
        var d = new Date();
        var dateS = d.getMonth() + 1 + "-" + d.getDate() + "-" + d.getFullYear();
        //$cordovaSQLite.execute(db, "INSERT INTO bills (name, payed,checkdate) values ('Bill 3', 0,?)",[dateS]);


    });
})

/**
 * The Projects factory handles saving and loading projects
 * from local storage, and also lets us save and load the
 * last active project index.
 */
.factory('Projects', function($q, $cordovaSQLite) {
    return {
        test: function() {
            var allProjects = [];
            var query = "SELECT id, title FROM projects";

            var deferred = $q.defer();

            $cordovaSQLite.execute(db, query).then(function(result) {
                console.log(result);
                deferred.resolve({
                    rows: result.rows
                });
                //console.log("result..", result);
                // console.log(self.allProjects);
                if (result.rows.length > 0) {
                    //console.log(result.rows.item(0));
                    for (var i = 0; i < result.rows.length; i++) {
                        console.log(result.rows.item(i));
                        allProjects.push(result.rows.item(i));
                    }
                } else {
                    $debug.warn("no rows");
                }
            }, function(error) {

                $debug.error("Error: ", error);
            }, function(updates) {
                deferred.update(updates);
            });

            return deferred.promise;
        },

        init: function() {
            $cordovaSQLite.execute(db, "CREATE TABLE IF NOT EXISTS projects(id integer primary key, title string)");
            $cordovaSQLite.execute(db, "CREATE TABLE IF NOT EXISTS tasks(id integer primary key, project_id integer , name text, done boolean)");
        },
        all: function(_db, $cordovaSQLite) {
            var allProjects = [];
            var query = "SELECT id, title FROM projects";

            var deferred = $q.defer();

            $cordovaSQLite.execute(db, query).then(function(result) {
                //console.log(result);
                deferred.resolve({
                    rows: result.rows
                });
                //console.log("result..", result);
                // console.log(self.allProjects);
                if (result.rows.length > 0) {
                    //console.log(result.rows.item(0));
                    for (var i = 0; i < result.rows.length; i++) {
                        //console.log(result.rows.item(i));
                        allProjects.push(result.rows.item(i));
                    }
                } else {
                    
                    console.log("no rows");
                }
            }, function(error) {

                console.log("Error: ", error);
            });

            var projectString = window.localStorage['projects'];

            if (projectString) {
                return angular.fromJson(projectString);
            }


            //            console.log(allProjects);

            return [];
        },
        save: function(projects) {
            window.localStorage['projects'] = angular.toJson(projects);
        },
        newProject: function(projectTitle) {
            // Add a new project
            return {
                title: projectTitle,
                tasks: []
            };
        },
        getLastActiveIndex: function() {
            return parseInt(window.localStorage['lastActiveProject']) || 0;
        },
        setLastActiveIndex: function(index) {
            window.localStorage['lastActiveProject'] = index;
        }
    }
})
    .factory('Bills', function($log, $q, $cordovaSQLite) {
        var getToday = function(){
            var d = new Date();
            return d.getMonth() + 1 + "-" + d.getDate() + "-" + d.getFullYear();
        }
        var dateHelper = function(){
            var d = new Date();
            return {
                day : function(){
                    return d.getDate();
                },
                month : function(){
                    return d.getMonth();
                },
                year : function(){
                    return d.getYear();
                },
                full : function(){
                    return d.getMonth() + 1 + "-" + d.getDate() + "-" + d.getFullYear();
                }
            }
        }
        
        return {
            all: function() {
                var query = "SELECT id, name, payed, checkdate FROM bills";
                
                $log.debug(dateHelper().day());

                var deferred = $q.defer();

                $cordovaSQLite.execute(db, query).then(function(result) {
                    deferred.resolve({
                        rows: result.rows
                    });
                }, function(error) {
                    console.log("Error: ", error);
                }, function(updates) {
                    deferred.update(updates);
                });

                return deferred.promise;
            },
            add : function(bill){
                var query = "INSERT INTO bills(name, payed, checkdate) VALUES(?,?,?)";
                
                 var deferred = $q.defer();

                $cordovaSQLite.execute(db, query, [bill.name, 0, getToday()]).then(function(result) {
                    $log.debug('sql success')
                    deferred.resolve({
                        rows: 1
                    });
                }, function(error) {
                    console.log("Error: ", error);
                }, function(updates) {
                    deferred.update(updates);
                });

                return deferred.promise;  

            }

        }
    })
    .controller('ToDoCtrl', function($log, $scope, $timeout, $ionicModal, Projects, Bills, $ionicSideMenuDelegate, $cordovaSQLite) {
        $scope.loadView = false;


        Projects.init();
        // Load or initialize projects
        $scope.projects = Projects.all(db, $cordovaSQLite);



        // Grab the last active, or the first project
        $scope.activeProject = $scope.projects[Projects.getLastActiveIndex()];

        $scope.bills = [];
       

        var loadBills = function() {
            console.log("Update Bills");
            Bills.all().then(function(data) {
                var b = [];
                for (var i = 0; i < data.rows.length; i++) {
                    b.push(data.rows.item(i));
                }
                $scope.bills = b;
                $scope.loadView = true;
            });
     
        }

        loadBills();

        $scope.updateBill = function(bill) {
            console.log(bill);


            //Move To Factory
            var query = "UPDATE Bills SET payed = ? WHERE id = ?";
            
            var reversePayed = (bill.payed) ? 0 : 1;
            console.log(reversePayed);
            $cordovaSQLite.execute(db, query, [reversePayed, bill.id]).then(function(res) {
                loadBills();
            }, function(err) {
                console.error(err);
            });

            loadBills(); //refresh the scope
        }



        //TEst methods that were used with sqlite----------
        $scope.new = function(project_id, name) {
            var query = "INSERT INTO tasks(project_id, name) VALUES(?,?)";
            $cordovaSQLite.execute(db, query, [project_id, name]).then(function(result) {
                console.log("INSERT ID: " + result.insertId)
            }, function(error) {
                console.log(error);
            });
        }



        $scope.allTasks = function() {
            console.log("dafuw", Projects.test());
            var query = "SELECT name FROM tasks";
            $cordovaSQLite.execute(db, query).then(function(result) {
                if (result.rows.length > 0) {
                    console.log(result.rows.item(0).name);

                }

            }, function(error) {
                console.log(error);
            });
        }
        //----------------------------------------------------


        // A utility function for creating a new project
        // with the given projectTitle
        var createProject = function(projectTitle) {
            var newProject = Projects.newProject(projectTitle);
            $scope.projects.push(newProject);
            Projects.save($scope.projects);
            $scope.selectProject(newProject, $scope.projects.length - 1);
        }



        // Called to create a new project
        $scope.newProject = function() {
            var projectTitle = prompt('Project name');
            if (projectTitle) {
                createProject(projectTitle);
            }
        };

        // Called to select the given project
        $scope.selectProject = function(project, index) {
            $scope.activeProject = project;
            Projects.setLastActiveIndex(index);
            $ionicSideMenuDelegate.toggleLeft(false); //Toggles the menu to open or close
        };

        // Create our modal
        $ionicModal.fromTemplateUrl('new-task.html', function(modal) {
            $scope.taskModal = modal;
        }, {
            scope: $scope
        });

        $scope.createTask = function(task) {
            if (!$scope.activeProject || !task) {
                return;
            }
            $scope.activeProject.tasks.push({
                title: task.title
            });
            $scope.taskModal.hide();


            // Inefficient, but save all the projects
            Projects.save($scope.projects);

            task.title = "";
        };

        $scope.createBill = function(bill) {
            if (!$scope.activeProject || !bill) {
                $log.debug('empty bill in create bill');
                return;
            }
            $log.debug('Creating new bill...', bill);

            Bills.add(bill).then(function(){$log.debug("Success .. Added New Bill")});

            loadBills();

            $scope.taskModal.hide();

            bill.name = "";
        };

        $scope.newBill = function() {
            $log.debug('Clicked New BIll');
            $scope.taskModal.show();
        };

        $scope.newTask = function() {
            $scope.taskModal.show();
        };

        $scope.closeNewTask = function() {
            $scope.taskModal.hide();
        }

        $scope.toggleProjects = function() {
            $ionicSideMenuDelegate.toggleLeft();
        };


        // Try to create the first project, make sure to defer
        // this by using $timeout so everything is initialized
        // properly
        $timeout(function() {
            if ($scope.projects.length == 0) {
                while (true) {
                    var projectTitle = prompt('Your first project title:');
                    if (projectTitle) {
                        createProject(projectTitle);
                        break;
                    }
                }
            }
        });

    });