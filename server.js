const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

const pool = mysql.createPool({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '',
    database: 'szerviz_db'
});



// 1.
app.get('/api/szolgaltatasok', async (req, res) => {
    try {
        const sql = `
            SELECT 
                s.id, 
                s.megnevezes, 
                s.alapar, 
                s.munkaido_perc, 
                s.aktiv, 
                k.nev AS kategoria_nev
            FROM szolgaltatasok s
            JOIN kategoriak k ON s.kategoria_id = k.id
            ORDER BY s.alapar ASC
        `;
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ hiba: error.message });
    }
});

// 2.
app.get('/api/szolgaltatasok/elerheto', async (req, res) => {
    try {
        const sql = `
            SELECT * FROM szolgaltatasok 
            WHERE aktiv = 1 AND munkaido_perc <= 60
        `;
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ hiba: error.message });
    }
});

// 3. GET
app.get('/api/szolgaltatasok/kereses/:szoveg', async (req, res) => {
    try {
        const keresettSzoveg = `%${req.params.szoveg}%`;
        const sql = `
            SELECT * FROM szolgaltatasok 
            WHERE megnevezes LIKE ?
        `;
        const [rows] = await pool.query(sql, [keresettSzoveg]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ hiba: error.message });
    }
});

// 4. GET
app.get('/api/kategoriak/statisztika', async (req, res) => {
    try {
        const sql = `
            SELECT 
                k.nev AS kategoria_nev,
                COUNT(s.id) AS szolgaltatasok_szama,
                ROUND(AVG(s.alapar), 1) AS atlagos_alapar
            FROM kategoriak k
            LEFT JOIN szolgaltatasok s ON k.id = s.kategoria_id
            GROUP BY k.id, k.nev
        `;
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ hiba: error.message });
    }
});

// 5. GET
app.get('/api/szolgaltatasok/dragak', async (req, res) => {
    try {
        const sql = `
            SELECT megnevezes, alapar, munkaido_perc 
            FROM szolgaltatasok 
            WHERE alapar > 25000 
            ORDER BY munkaido_perc DESC
        `;
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ hiba: error.message });
    }
});


//post, put, delete


// 6. POST
app.post('/api/szolgaltatasok', async (req, res) => {
    try {
        const { kategoria_id, megnevezes, alapar, munkaido_perc, aktiv } = req.body;

        if (!megnevezes || alapar === undefined || munkaido_perc === undefined) {
            return res.status(400).json({ hiba: 'A megnevezes, alapar és munkaido_perc megadása kötelező!' });
        }

        const aktivErtek = aktiv !== undefined ? aktiv : 1;

        const sql = `
            INSERT INTO szolgaltatasok (kategoria_id, megnevezes, alapar, munkaido_perc, aktiv)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(sql, [
            kategoria_id || null,
            megnevezes,
            alapar,
            munkaido_perc,
            aktivErtek
        ]);

        res.status(201).json({
            uzenet: 'Szolgáltatás sikeresen létrehozva!',
            id: result.insertId
        });
    } catch (error) {
        
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ hiba: 'A megadott kategoria_id nem létezik!' });
        }
        res.status(500).json({ hiba: error.message });
    }
});

// 7. PUT
app.put('/api/szolgaltatasok/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { kategoria_id, megnevezes, alapar, munkaido_perc, aktiv } = req.body;

        if (!megnevezes || alapar === undefined || munkaido_perc === undefined || aktiv === undefined) {
            return res.status(400).json({ hiba: 'Minden kötelező mezőt (megnevezes, alapar, munkaido_perc, aktiv) meg kell adni!' });
        }

        const sql = `
            UPDATE szolgaltatasok 
            SET kategoria_id = ?, megnevezes = ?, alapar = ?, munkaido_perc = ?, aktiv = ?
            WHERE id = ?
        `;
        const [result] = await pool.query(sql, [
            kategoria_id || null,
            megnevezes,
            alapar,
            munkaido_perc,
            aktiv,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ hiba: 'A megadott ID-val nem található szolgáltatás!' });
        }

        res.json({ uzenet: 'Szolgáltatás sikeresen frissítve!' });
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ hiba: 'A megadott kategoria_id nem létezik!' });
        }
        res.status(500).json({ hiba: error.message });
    }
});

// 8. DELETE
app.delete('/api/szolgaltatasok/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = 'DELETE FROM szolgaltatasok WHERE id = ?';
        const [result] = await pool.query(sql, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ hiba: 'A megadott ID-val nem található szolgáltatás!' });
        }

        res.json({ uzenet: 'Szolgáltatás sikeresen törölve!' });
    } catch (error) {
        res.status(500).json({ hiba: error.message });
    }
});

// Szerver indítása
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`A szerver fut a http://localhost:${PORT} címen`);
});