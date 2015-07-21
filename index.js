var main = require('./lib/server');

if (require.main === module) { 
    main.start();
}
else { 
    module.exports = main;
}
