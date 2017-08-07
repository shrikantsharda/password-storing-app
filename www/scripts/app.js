'use strict';
// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'

//var db = window.openDatabase("test.db", '1', 'test', 1024*1024*100); //Dev to work in webview

angular.module('App1', ['ionic', 'ngCordova', 'lokijs', 'ion-floating-menu'])

.run(function($ionicPlatform, $cordovaSQLite, $rootScope, FoldersService, $state, $cipherFactory) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

      // Don't remove this line unless you know what you are doing. It stops the viewport
      // from snapping when text inputs are focused. Ionic handles this internally for
      // a much nicer keyboard experience.
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }

    //window.localStorage.clear();

    FoldersService.initDB();

    FoldersService.getAllFolders().then(function(folders) {
      $rootScope.folders = folders;
      $rootScope.activeFolder = $rootScope.folders[0];
    });
    FoldersService.getAllVariables().then(function(variables) {
      $rootScope.variables = variables;
    });
    $rootScope.authString = FoldersService.findVariable('authString');

    if (!$rootScope.authString) {
      $state.go('createMasterPassword');
    } else {
      $state.go('login');
    }
  });
  document.addEventListener("resume", function() {
    $state.go("login", {}, {location: "replace"});
  }, false);
  document.addEventListener("pause", function() {
    $state.go("login", {}, {location: "replace"});
  }, false);
})

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('login', {
      url:'/login',
      templateUrl: 'templates/login.html',
          controller: 'FolderCtrl'
    })
    .state("createMasterPassword", {
            url: "/createMasterPassword",
            templateUrl: "templates/create_masterPassword.html",
            controller: "FolderCtrl"
    })
    .state('resetMasterPassword', {
      url:'/resetMasterPassword',
      templateUrl: 'templates/reset_masterPassword.html',
          controller: 'FolderCtrl'
    })
    .state('entries', {
      url:'/entries',
      templateUrl: 'templates/entries.html',
          controller: 'FolderCtrl'
    })
    .state('entry', {
      url:'/entries/:entryid',
      templateUrl: 'templates/entry.html',
          controller: 'FolderCtrl'
    });

  //$urlRouterProvider.otherwise('/resetMasterPassword');
})

.factory("$cipherFactory", function() {

    return {

        encrypt: function(message, password) {
            var salt = forge.random.getBytesSync(128);
            var key = forge.pkcs5.pbkdf2(password, salt, 4, 16);
            var iv = forge.random.getBytesSync(16);
            var cipher = forge.cipher.createCipher('AES-CBC', key);
            cipher.start({iv: iv});
            cipher.update(forge.util.createBuffer(message));
            cipher.finish();
            var cipherText = forge.util.encode64(cipher.output.getBytes());
            return {cipher_text: cipherText, salt: forge.util.encode64(salt), iv: forge.util.encode64(iv)};
        },

        decrypt: function(cipherText, password, salt, iv, options) {
            var key = forge.pkcs5.pbkdf2(password, forge.util.decode64(salt), 4, 16);
            var decipher = forge.cipher.createDecipher('AES-CBC', key);
            decipher.start({iv: forge.util.decode64(iv)});
            decipher.update(forge.util.createBuffer(forge.util.decode64(cipherText)));
            decipher.finish();
            if(options !== undefined && options.hasOwnProperty("output") && options.output === "hex") {
                return decipher.output.toHex();
            } else {
                return decipher.output.toString();
            }
        }

    };

})

.factory('FoldersService', function($q, Loki) {
  var _db;
  var _folders;
  var _variables;

  return {
    initDB: function() {
      var fsAdapter = new LokiCordovaFSAdapter({"prefix": "loki"});

      _db = new Loki('foldersDB', {
        autosave: true,
        autosaveInterval: 1000,
        persistenceAdapter: fsAdapter
      });
    },
    getAllFolders: function() {

      return $q(function(resolve, reject) {
        if (_db) {
          var options = {};

          _db.loadDatabaseInternal(options, function() {
            _folders = _db.getCollection('folders');

            if (!_folders) {
              _folders = _db.addCollection('folders');
            }

            resolve(_folders.data);
          });
        }
      });
    },
    addFolder: function(folder) {
      _folders.insert(folder);
    },
    updateFolder: function(folder) {
      _folders.update(folder);
    },
    deleteFolder: function(folder) {
      _folders.remove(folder);
    },
    newFolder: function(folderTitle) {
      return {
        title: folderTitle,
        entries: []
      };
    },
    getAllVariables: function() {

      return $q(function(resolve, reject) {
        if (_db) {
          var options = {};

          _db.loadDatabaseInternal(options, function() {
            _variables = _db.getCollection('variables');

            if (!_variables) {
              _variables = _db.addCollection('variables');
            }

            resolve(_variables.data);
          });
        }
      });
    },
    addVariable: function(variable) {
      _variables.insert(variable);
    },
    updateVariable: function(variable) {
      _variables.update(variable);
    },
    deleteVariable: function(variable) {
      _variables.remove(variable);
    },
    newVariable: function(variableName) {
      return {
        name: variableName
      };
    },
    findVariable: function(variableName) {
      return _variables.findOne({'name': {'$eq': variableName}});
    }
  }
})

.controller('FolderCtrl', function($rootScope, $scope, $timeout, $ionicModal, FoldersService, $cipherFactory, $ionicSideMenuDelegate, $ionicActionSheet, $stateParams, $ionicPopup, $state) {

  $scope.createMasterPassword = function(newMasterPassword) {
    if (!newMasterPassword || newMasterPassword === '') {
      alert("Master Password Cannot be blank!");
      return;
    }
    var temp = $cipherFactory.encrypt("Authenticated", newMasterPassword);
    console.log(temp);
    var masterPass = FoldersService.newVariable('authString');
    $scope.copyObj(masterPass, temp);
    console.log(masterPass);
    FoldersService.addVariable(masterPass);
    $rootScope.storedMasterPass = newMasterPassword;
    $state.go('entries');
  }

  $scope.unlockApp = function(enteredMasterPassword) {
    var decipherPhrase = $cipherFactory.decrypt($scope.authString.cipher_text, enteredMasterPassword, $scope.authString.salt, $scope.authString.iv, {output: "hex"});
    if (decipherPhrase === "Authenticated".toHex()) {
      $state.go('entries');
      enteredMasterPassword = {};
      $rootScope.storedMasterPass = enteredMasterPassword;
    } else {
      alert("Password Incorrect!");
    }
  }

  $scope.showResetScreen = function() {
    $state.go('resetMasterPassword');
  }

  $scope.resetMasterPass = function(oldMasterPassword, resetNewMasterPassword, confirmRestetPassword) {
    if (resetNewMasterPassword !== confirmRestetPassword) {
      alert("The Confirm Password doesn't match!");
    } else if (!oldMasterPassword || !resetNewMasterPassword || !confirmRestetPassword || oldMasterPassword === '') {
      alert("All fields are compulsory!");
    } else {
      var decipherPhrase = $cipherFactory.decrypt($scope.authString.cipher_text, oldMasterPassword, $scope.authString.salt, $scope.authString.iv, {output: "hex"});
      if (decipherPhrase === "Authenticated".toHex()) {
        var temp = $cipherFactory.encrypt("Authenticated", resetNewMasterPassword);
        $scope.copyObj($scope.authString, temp);
        FoldersService.updateVariable($scope.authString);
        $rootScope.storedMasterPass = resetNewMasterPassword;
        $state.go('entries');
      }
    }
  }

  var createFolder = function(folderTitle) {
    var newFolder = FoldersService.newFolder(folderTitle);
    // $scope.folders.push(newFolder);
    FoldersService.addFolder(newFolder);
    $scope.selectFolder(newFolder);
  }

  $scope.newFolder = function() {
    var folderTitle = prompt('Folder Name');
    if(folderTitle) {
      createFolder(folderTitle);
    }
  }

  $scope.selectFolder = function(folder) {
    $scope.activeFolder = folder;
    $ionicSideMenuDelegate.toggleLeft(false);
    console.log($scope.folders);
    console.log($scope.variables);
    console.log($scope.authString);
  }

  $ionicModal.fromTemplateUrl('templates/new-entry.html', function(modal) {
    $scope.entryModal = modal;
  }, {
    scope: $scope
  });

  $ionicModal.fromTemplateUrl('templates/edit-entry.html', function(modal) {
    $scope.editEntryModal = modal;
  }, {
    scope: $scope
  });

  $scope.editFolder = function() {
    if ($scope.activeFolder) {
      var newFolderTitle = prompt('New name of folder ' + $scope.activeFolder.title);
      if(newFolderTitle) {
        $scope.activeFolder.title = newFolderTitle;
        FoldersService.updateFolder($scope.activeFolder);
      }
    } else {
      alert("Create a Folder First");
    }
  }

  $scope.showFolderActionSheet = function(folder) {
    $scope.activeFolder = folder;
    $ionicActionSheet.show({
      titleText: folder.title,
      buttons: [
        { text: 'Edit <i class="icon ion-compose"></i>' }
      ],
      destructiveText: 'Delete',
      cancelText: 'Cancel',
      cancel: function() {
        //console.log('CANCELLED');
        return true;
      },
      buttonClicked: function(index) {
        var newFolderTitle = prompt('New Folder Name');
        if(newFolderTitle) {
          folder.title = newFolderTitle;
          FoldersService.updateFolder(folder);
        }
        return true;
      },
      destructiveButtonClicked: function() {
        var confirmPopup = $ionicPopup.confirm({
          title: 'Are you sure you want to delete ' + folder.title,
          template: 'All your password entries in ' + folder.title + ' will be deleted'
        });

        confirmPopup.then(function(res) {
          if (res) {
            FoldersService.deleteFolder(folder);
            $scope.activeFolder = $scope.folders[0];
            $scope.selectFolder($scope.activeFolder);
          }
        });

        // FoldersService.deleteFolder(folder);
        // $scope.activeFolder = $scope.folders[0];
        // $scope.selectFolder($scope.activeFolder);
        return true;
      }
    });
    console.log(folder.title);
  }

  $scope.folderExist = function() {
    if ($scope.folders) {
      return true;
    }
    return false;
  }

  $scope.tempVar = 0;

  $scope.uniqueId = function() {
    $scope.tempVar++;
    return $scope.tempVar;
  }

  $scope.createEntry = function(entry) {
    if(!$scope.activeFolder) {
      return;
    } else if (!entry || !entry.name || !entry.username || !entry.password || entry.name === '' || entry.username === '' || entry.password === '') {
      alert("Name, Username and Password are required!");
      //$scope.entryModal.hide();
      return;
    }
    $scope.activeFolder.entries.push({
      id: Date.now(),
      name: entry.name,
      username: entry.username,
      password: entry.password,
      remarks: entry.remarks
    });
    $scope.entryModal.hide();

    // Inefficient, but save all the projects
    FoldersService.updateFolder($scope.activeFolder);

    entry.name = "";
    entry.username = "";
    entry.password = "";
    entry.remarks = "";
  };

  $scope.showNewEntry = function() {
    if ($scope.activeFolder) {
      $scope.entryModal.show();
    } else {
      alert("Create a Folder First");
    }
  };

  $scope.closeNewEntry = function() {
    $scope.entryModal.hide();
    $scope.newEntry= null;
  }

  $scope.closeEditEntry = function() {
    $scope.editEntryModal.hide();
    $scope.currEntry = $scope.oldEntry;
  }

  $scope.showEntryrActionSheet = function(entry) {
    $ionicActionSheet.show({
      titleText: entry.name,
      buttons: [
        { text: 'Edit <i class="icon ion-compose"></i>' }
      ],
      destructiveText: 'Delete',
      cancelText: 'Cancel',
      cancel: function() {
        //console.log('CANCELLED');
        return true;
      },
      buttonClicked: function(index) {
        $scope.showEditEntry(entry);
        return true;
      },
      destructiveButtonClicked: function() {
        var confirmPopup = $ionicPopup.confirm({
          title: 'Are you sure you want to delete ' + entry.name,
          template: 'All your password details in ' + entry.name + ' will be deleted'
        });

        confirmPopup.then(function(res) {
          if (res) {
            if ($scope.activeFolder) {
              var i = $scope.getEntryIndex(entry);
              $scope.activeFolder.entries.splice(i, 1);
              FoldersService.updateFolder($scope.activeFolder);
            }
          }
        });
        return true;
      }
    });
    console.log(entry.name);
  }

  $scope.copyObj = function(dst, src) {
    Object.keys(src).forEach(function(key) {
      dst[key] = src[key];
    });
  };

  $scope.showEditEntry = function(entry) {
    if ($scope.activeFolder) {
      $scope.oldEntry = {};
      $scope.copyObj($scope.oldEntry, entry);
      $scope.entry = entry;
      $scope.entryName = entry.name;
      $scope.editEntryModal.show();
    } else {
      alert("Create a Folder First");
    }
  };

  $scope.editEntry = function(entry) {
    if (!entry || !entry.name || !entry.username || !entry.password || entry.name === '' || entry.username === '' || entry.password === '') {
      alert("Name, Username and Password are required!");
      return;
    }
    if ($scope.activeFolder) {
      var i = $scope.getEntryIndex(entry);
      $scope.activeFolder.entries[i] = entry;
      FoldersService.updateFolder($scope.activeFolder);
    } else {
      alert("Error: No active folder");
    }
    $scope.editEntryModal.hide();
  };

  $scope.getEntryIndex = function(entry) {
    if ($scope.activeFolder) {
      var i = 0;
      for (i = 0; i < $scope.activeFolder.entries.length; i++) {
        if (entry.id === $scope.activeFolder.entries[i].id) {
          return i;
        }
      }
    }
    return -1;
  };

  $scope.showEntry = function(entry) {
    $rootScope.currEntry = entry;
  };

  $scope.toggleFolders = function() {
    $ionicSideMenuDelegate.toggleLeft();
  };

  // $timeout(function() {
  //   if($scope.folders.length == 0) {
  //     while(true) {
  //       var foldertTitle = prompt('Your first Folder:');
  //       if(folderTitle) {
  //         createFolder(FolderTitle);
  //         break;
  //       }
  //     }
  //   }
  // }, 1000);
})

String.prototype.toHex = function() {
    var buffer = forge.util.createBuffer(this.toString());
    return buffer.toHex();
}

String.prototype.toSHA1 = function() {
    var md = forge.md.sha1.create();
    md.update(this);
    return md.digest().toHex();
}

// .factory('FoldersServicePouch', function($q) {
//   var db;

//   var folders;

//   return {
//     initDB: function() {
//       db = new PouchDB('folders', {adapter: 'websql'});
//     },
//     addFolder: function(folder) {
//       return $q.when(db.post(folder));
//     },
//     updateFolder: function(folder) {
//       return $q.when(_db.put(folder));
//     },
//     deleteFolder: function(folder) {
//       return $q.when(_db.remove(folder));
//     },
//     onDatabaseChange: function(change) {
//       var index = findIndex(folders, change.id);
//       var folder = folders[index];

//       if (change.deleted) {
//         if (folder) {
//           folders.splice(index, 1);
//         }
//       } else {
//         if (folder && folder._id == change.id) {
//           folders[index] = change.doc;
//         } else {
//           folders.splice(index, 0, change.doc)
//         }
//       }
//     },
//     getAllFolders: function() {
//       if(!folders) {
//         return $q.when(db.allDocs({include_docs: true})).then(function(docs) {
//           folders = docs.rows.map(function(row) {
//             return row.doc;
//           });

//           db.changes({ live: true, since: 'now', include_docs: true}).on('change', onDatabaseChange(change));

//           return folders;
//         });
//       } else {
//         return $q.when(folders);
//       }
//     },
//     findIndex: function(array, id) {
//       var low = 0, high = array.length, mid;
//       while (low < high) {
//         mid = (low + high) >>> 1;
//         array[mid]._id < id ? low = mid + 1 : high = mid
//       }
//       return low;
//     },
//     newFolder: function(folderTitle) {
//       return {
//         title: folderTitle,
//         entries: []
//       };
//     }
//   }
// }) 