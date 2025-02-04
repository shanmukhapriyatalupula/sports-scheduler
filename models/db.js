const { Pool } = require('pg');
const pool = new Pool({
    user: 'ShanmukhaPriya',
    host: 'localhost',
    database: 'sports_scheduler',
    password: 'shannu@2005',
    port: 5432,
});

module.exports = pool;
