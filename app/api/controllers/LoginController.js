/**
 * LoginController
 *
 * @description :: Used to login or logout user
 */

module.exports = {
	login: function (req, res) {
    sails.log.verbose("[LoginCtrl] Action 'login' called");
		var bcrypt = require('bcryptjs');

		//Check if username or password were entered
		if (!req.body.username || !req.body.password){
			sails.log.info('[LoginCtrl.login] No username or password provided');
			return res.json({ error: 'You need to enter username and password' }, 500);
		}

		// Search one user by username
		User.findOneByUsername(req.body.username).exec(function(err, user){
			// Return if an error occoured
			if (err){
				sails.log.error(err);
				return res.json({ error: 'Server error' }, 500);
			}

			// Return if no user was found
			if (!user) {
				sails.log.info('[LoginCtrl.login] Username "'+req.body.username+'" not found.');
				return res.json({ error: 'User not found' }, 404);
			}

			// Check password
			bcrypt.compare(req.body.password, user.password, function(err, match){
				// Return if an error occoured
				if (err){
					sails.log.error(err);
					return res.json({ error: 'Server error' }, 500);
				}

				// If passwords match log user in, else return an error
				if (match){
					sails.log.info('[LoginCtrl.login] User "'+req.body.username+'" logged in!');
					req.session.authenticated = true;
          req.session.user = user;

          //Update onlinestatus
          User.update({id: user.id}, {online: true}).exec(function(err, updated){
              // Publish online notifaction to socket
              User.publishUpdate(user.id, {
                id: user.id,
                username: user.username,
                firstname: user.firstname,
                lastname: user.lastname,
                online: true
              });
          });

          return res.json('Success', 200);
				}else{
					sails.log.info('[LoginCtrl.login] Invalid password');
					req.session.authenticated = false;
          req.session.user = null;
					return res.json({ error: 'Invalid password' }, 400);
				}
			});
		});
	},

	logout: function(req, res){
    sails.log.verbose("[LoginCtrl] Action 'logout' called");
		sails.log.info('[LoginCtrl.logout] User "'+ '' +'" logged out!');

    //Update onlinestatus
    User.update({id: req.session.user.id}, {online: false}).exec(function(err, updated){
        // Publish online notifaction to socket
        User.publishUpdate(updated[0].id, {
          id: updated[0].id,
          username: updated[0].username,
          firstname: updated[0].firstname,
          lastname: updated[0].lastname,
          online: false
        });
    });

    req.session.authenticated = false;
    req.session.user = null;
		return res.json('logged out!', 200);
	},

  forgotPassword: function(req, res){
    sails.log.verbose("[LoginCtrl] Action 'forgotPassword' called");

    if (!req.body.email){
      sails.log.info('[LoginCtrl.forgotPassword] No email given');
      return res.json({ error: 'You have to enter an email' }, 500);
    }

    // Search one user by email
    User.findOneByEmail(req.body.email).exec(function(err, user){
      // Return if an error occoured
      if (err){
        sails.log.error(err);
        return res.json({ error: 'Server error' }, 500);
      }

      // Return if no user was found
      if (!user) {
        sails.log.info('[LoginCtrl.forgotPassword] Email "'+req.body.email+'" not in use.');
        return res.json({ error: 'Email "'+req.body.email+'" not in use.' }, 500);
      }

      sails.log.info('[LoginCtrl.forgotPassword] User "'+ user.username +'" found!');

      var bcrypt = require('bcryptjs');
      var mailer = require('nodemailer');

      sails.log.info('[LoginCtrl.forgotPassword] Create nodemailer transport!');
      var transport = mailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'projecthubteam@gmail.com',
          pass: 'ldkb4sfvh8f#'
        }
      });

      sails.log.info('[LoginCtrl.forgotPassword] Send reset mail');
      var mailText = 'Follow the link to reset your password: ' +
                    req.protocol + '://' + req.host + ':' + sails.config.port + // Create link to projecthub website dynamically depending on current configuration.
                    '/start/#/reset/'+
                    //'id='+user._id+'/'
                    user.username + '/' +
                    require('crypto').createHash('md5').update(user.username + user.password).digest("hex"); // Security key, to prevent changing mail of other users

      transport.sendMail({
        from: 'ProjectHub',
        to: user.email,
        subject: "Password forgot!",
        text: mailText
      });

      return res.json('Reset mail sent!', 200);
    });
  },

  resetPassword: function(req, res){
    sails.log.verbose("[LoginCtrl] Action 'resetPassword' called");
    sails.log.info('[LoginCtrl.resetPassword] User wants to reset his password!');

    // Check if username was provided!
    if (!req.body.username){
      sails.log.info('[LoginCtrl.resetPassword] Link not valid: Username missing!');
      return res.json({ error: 'Link not valid: Username is missing!' }, 500);
    }

    // Check if security key was provided!
    if (!req.body.key){
      sails.log.info('[LoginCtrl.resetPassword] Link not valid: Key is missing!');
      return res.json({ error: 'Link not valid: Key is missing!' }, 500);
    }

    // Search one user by email
    User.findOneByUsername(req.body.username).exec(function(err, user) {
      // Return if an error occoured
      if (err) {
        sails.log.error(err);
        return res.json({error: 'Server error'}, 500);
      }

      // Return if no user was found
      if (!user) {
        sails.log.info('[LoginCtrl.resetPassword] Username "'+req.body.username+'" not found.');
        return res.json({ error: 'User not found' }, 404);
      }

      // Check security token
      var hash = require('crypto').createHash('md5').update(user.username + user.password).digest("hex");

      // Return if key isn't correct
      if (hash != req.body.key){
          sails.log.info('[LoginCtrl.resetPassword] Key not valid!');
          return res.json({ error: 'Key not valid!' }, 500);
      }

      // Everything fine -> update user
      User.update({username: user.username}, {password: require('bcryptjs').hashSync(req.body.password, 10)}).exec(function(err, update){
        // Return if an error occoured
        if (err){
          sails.log.error(err);
          return res.json({ error: 'Server error' }, 500);
        }

        sails.log.info('[LoginCtrl.resetPassword] User password sucessfully updated!');
        return res.json('Sucess', 200);
      });
    });
  }

};

