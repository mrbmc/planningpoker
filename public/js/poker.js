(function (planningShark) {
	//poker is our planning poker module.
	planningShark.poker =  {};
	planningShark.poker.createCtrl = function ($scope, $location) {

		$scope.join = function() {
			$location.path('/channel/' + Math.random().toString(36).substring(7) + '/' + $scope.userName + '/true');
		};
	};

	//Join controller.
	planningShark.poker.joinCtrl = function ($scope, $location, $routeParams) {
	
		$scope.channelId = $routeParams.channelId;

		$scope.join = function () {
			//TODO: find a way to add this to a module, think messaging or planning.....?
			$location.path('/channel/' + $scope.channelId + '/' + $scope.userName); 
		};
	};

	//Channel controller.
	planningShark.poker.channelCtrl = function ($scope, $http, $location, $routeParams, Messaging) {
	
		//scope variables:
		$scope.currentUser = { name : $routeParams.userName };
		$scope.channelId = $routeParams.channelId;
		$scope.isMaster = $routeParams.master === 'true';
		//TODO: configure different card 'decks'
		$scope.cards = ['0', '1/2', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', 'coffee'];
		$scope.users = [$scope.currentUser];
		//Todo:Get better name.
		$scope.voteSummary = [];

		//UI events:
		//sends the vote message.
		$scope.vote = function(card) {
			$scope.currentUser.vote = card;
			Messaging.publish({eventType : 'vote', vote : card, name : $scope.currentUser.name});
		}
		//TODO: work on a naming convention.
		$scope.toggleVotes = function (val) {
			if($scope.isMaster) {
				//TODO: this is not the best way to accomplish this.
				$scope.revealed = val ;
				Messaging.publish({eventType : 'toggle', reveal : $scope.revealed });
			}
		}
		$scope.resetVotes = function () {
			if($scope.isMaster) {
				Messaging.publish({eventType : 'reset'});
			}
		}

		//private functions:

		//Adds a user to the current user list.
		var addUser = function (user) {
			$scope.$apply(function (){
				$scope.users.push(user);
			});
		}

		var getVoteGroupIndex = function (vote) {
			var retValue = null;
			angular.forEach($scope.voteSummary, function (v) {
				if (v.vote == vote) {
					retValue = v;
				}
			});

			return retValue;
		};
	
		var generateVoteSummary = function () {
			$scope.voteSummary = []
			angular.forEach($scope.users, function (u) {
				var existingVoteCount = getVoteGroupIndex(u.vote);
				if(existingVoteCount) {
					existingVoteCount.count++;
				}
				else {
					$scope.voteSummary.push({
						vote : u.vote,
						count : 1  
					});
				}
			});
		}

		//checks if a user exists in the current user list, callback upon finding him
		var userExists = function (name, onExists) {
			var retuser;
			angular.forEach($scope.users, function(u){
				if(u.name === name) {
					retuser = u;
					onExists(u);
				}
			});
			return retuser; 
		}

		var userAttendance = function () {
			Messaging.publish({ eventType : 'join', name : $scope.currentUser.name });
		}

		//Events Triggered by Messaging:

		//we take action on Another user joining.
		var onPeerJoin = function (message) {
			if(!userExists(message.name, function(){;})) {
				addUser({name : message.name});
				userAttendance();
			}
		}

		//we take action on another user voting.
		var onPeerVote = function (message) {
			var user = userExists(message.name, function(u){
				//u.name = "updated";
				$scope.$apply(function () {
					u.vote = message.vote;
				});
			});
			if(!user) {
				addUser({ name : message.name, vote : message.vote });
			}
			//Make sure that the summaries are updated.
			$scope.$apply(function () {
				generateVoteSummary();
			});
		}
		//action to be executed upon joining the channel
		var onConnect = function () {
			userAttendance();
		};

		//visibility has been toggled by the master
		var onToggle = function (message) {
			$scope.$apply(function() {
				$scope.revealed = message.reveal;	
			})
		};

		//vote reset has been initiated by master
		var onReset = function (message) {
			$scope.$apply(function (){
				$scope.currentUser.vote = null;
				angular.forEach($scope.users, function(u){
					u.vote = null;
					$scope.revealed = false;
				})
			});
		}

		//TODO: display better error messages.
		var onDisconnect = function (message) {
			//TODO: implement better error messaging.
			console.log('connected');
		}

		//TODO: 
		var onReconnect = function (message) {
			//TODO: implement better error messaging.
			console.log('disconnected');
		}
		
		//All messages will be processed.
		var onMessage = function(message) {

			//determine what event has taken place
			if(message.eventType === 'vote') {
				onPeerVote(message);
			}
			if(message.eventType === 'join' && message.name !== $scope.currentUser.name) {
				onPeerJoin(message);
			}
			if(message.eventType === 'toggle') {
				onToggle(message);
			}
			if(message.eventType === 'reset') {
				onReset(message);
			}
		}	
		//sets up the messaging subscription.
		var options = {
			channel : $scope.channelId,
			message : onMessage,
			connect : onConnect, 
			disconnect : onDisconnect, 
			reconnect : onReconnect,
			keepAlive : $scope.isMaster
		}
		Messaging.subscribe(options);
	}
	
})(this.planningShark = this.planningShark || {});