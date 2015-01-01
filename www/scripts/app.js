'use strict';
// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'

var db = window.openDatabase("TodoDevDB", "1.0", "Todo Dev Database", 10000); //Dev to work in webview

angular.module('App1', ['ionic', 'config', 'ngCordova'])

.run(function($ionicPlatform, $cordovaSQLite) {
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
        console.log('creating DB');


    });
})
    .factory('dateHelper', function($log){
            var monthNames = [
                "January", "February", "March",
                "April", "May", "June",
                "July", "August", "September",
                "October", "November", "December"
                ];
            var d = new Date();
            return {
                day : function(){
                    return d.getDate();
                },
                monthAsNumber : function(){
                    return d.getMonth() + 1;
                },
                monthAsString : function(){
                    return monthNames[d.getMonth()];
                },
                monthAsStringShort : function(){
                    return monthNames[d.getMonth()].slice(0,3);
                },
                year : function(){
                    return d.getYear(); 
                },
                full : function(){
                    return d.getMonth() + 1 + "-" + d.getDate() + "-" + d.getFullYear();
                }
            }
        
    })

    .factory('Bills', function($log, $q, $cordovaSQLite, dateHelper) {
        return {
            all: function() {
                var query = "SELECT id, name, payed, checkdate FROM bills";
                
                $log.debug(dateHelper.day());

                var deferred = $q.defer();
                $log.debug('query db');
                $cordovaSQLite.execute(db, query).then(function(result) {
                    deferred.resolve({
                        rows: result.rows
                    });
                }, function(error) {
                    deferred.resolve({
                        rows: []
                    });
                    $log.warn("Error: ", error);
                }, function(updates) {
                    deferred.update(updates);
                });

                return deferred.promise;
            },
            add : function(bill){
                var query = "INSERT INTO bills(name, payed, checkdate) VALUES(?,?,?)";
                
                 var deferred = $q.defer();

                $cordovaSQLite.execute(db, query, [bill.name, 0, dateHelper.full]).then(function(result) {
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
            },
            delete : function(bill){
                console.log('To Delte a bill');
                var query = "DELETE FROM bills where id = ?";
                
                var deferred = $q.defer();

                $cordovaSQLite.execute(db, query, [bill.id]).then(function(result) {
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
    .controller('ToDoCtrl', function($log, $scope, $timeout, $ionicModal,  Bills, $ionicSideMenuDelegate, $cordovaSQLite, dateHelper) {
        $scope.loadView = false;

        $scope.currentMonth = dateHelper.monthAsStringShort();

        $scope.bills = [];
       
        $scope.showRemove = false;


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


        $scope.editToggle = function(){
            $scope.showRemove = !$scope.showRemove;
        }

        $scope.removeBill = function(bill){
            
            Bills.delete(bill);
            loadBills();
        }

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


        
        // Create our modal
        $ionicModal.fromTemplateUrl('new-task.html', function(modal) {
            $scope.taskModal = modal;
        }, {
            scope: $scope
        });

       
        $scope.createBill = function(bill) {
            if (!bill) { //If input is empty
                $log.warn('empty bill in create bill');
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

      

        $scope.closeNewBill = function() {
            $scope.taskModal.hide();
        }


        // Try to create the first project, make sure to defer
        // this by using $timeout so everything is initialized
        // properly
        
        // $timeout(function() {
        //     if ($scope.projects.length == 0) {
        //         while (true) {
        //             var projectTitle = prompt('Your first project title:');
        //             if (projectTitle) {
        //                 createProject(projectTitle);
        //                 break;
        //             }
        //         }
        //     }
        // });

    });