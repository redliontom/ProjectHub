/**
* PrivateChatMsg.js
*
* @description :: Represents a user of ProjectHub
*/

module.exports = {
  attributes: {
    message: {
      type: 'text',
      minLength: 1
    },

  	sender: {
  		model: 'user'
  	},

    sendername: {
      type: 'string',
      minLength: 3,
      maxLength: 32
    },

    project: {
      model: 'project'
    }
  }
};

