const bcrypt = require('bcryptjs');
const db = require('../config/db');

// GET /api/placement/companies - List all companies
async function getAllCompanies(req, res) {
  try {
    if (db.isMySQLConnected()) {
      const sql = `
        SELECT c.*, u.email as account_email,
               (SELECT COUNT(*) FROM PlacementDrives pd WHERE pd.company_id = c.id) as total_drives
        FROM Companies c
        JOIN Users u ON c.user_id = u.id
        ORDER BY c.id ASC
      `;
      const companies = await db.query(sql);
      return res.json({ success: true, companies: companies || [] });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const companies = inMem.Companies.map(c => {
      const user = inMem.Users.find(u => u.id === c.user_id);
      const drivesCount = inMem.PlacementDrives.filter(d => d.company_id === c.id).length;
      return {
        ...c,
        account_email: user ? user.email : c.contact_email,
        total_drives: drivesCount
      };
    });
    res.json({ success: true, companies });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve companies: ' + err.message });
  }
}

// GET /api/placement/companies/:id - Get company by ID
async function getCompanyById(req, res) {
  try {
    const companyId = parseInt(req.params.id, 10);
    if (isNaN(companyId)) {
      return res.status(400).json({ success: false, message: 'Invalid company ID.' });
    }

    if (db.isMySQLConnected()) {
      const sql = `
        SELECT c.*, u.email as account_email
        FROM Companies c
        JOIN Users u ON c.user_id = u.id
        WHERE c.id = ?
      `;
      const rows = await db.query(sql, [companyId]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Company not found.' });
      }

      const drives = await db.query('SELECT * FROM PlacementDrives WHERE company_id = ?', [companyId]);
      return res.json({ success: true, company: { ...rows[0], drives: drives || [] } });
    }

    const inMem = db.getInMemStore();
    const c = inMem.Companies.find(comp => comp.id === companyId);
    if (!c) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }
    const user = inMem.Users.find(u => u.id === c.user_id);
    const drives = inMem.PlacementDrives.filter(d => d.company_id === companyId);
    res.json({
      success: true,
      company: { ...c, account_email: user ? user.email : c.contact_email, drives }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve company: ' + err.message });
  }
}

// POST /api/placement/companies - Add company
async function createCompany(req, res) {
  try {
    const {
      company_name,
      industry,
      website = null,
      contact_person,
      contact_email,
      password = 'Company@123'
    } = req.body;

    if (!company_name || !industry || !contact_person || !contact_email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: company_name, industry, contact_person, contact_email.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (db.isMySQLConnected()) {
      // Check existing user email
      const userCheck = await db.query('SELECT id FROM Users WHERE email = ?', [contact_email]);
      if (userCheck && userCheck.length > 0) {
        return res.status(409).json({ success: false, message: `Email '${contact_email}' is already registered.` });
      }

      // Create HR User
      const userRes = await db.query(
        'INSERT INTO Users (email, password, role) VALUES (?, ?, ?)',
        [contact_email, passwordHash, 'hr']
      );
      const newUserId = userRes.insertId;

      // Create Company
      const compRes = await db.query(
        `INSERT INTO Companies (user_id, company_name, industry, website, contact_person, contact_email)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newUserId, company_name, industry, website, contact_person, contact_email]
      );
      const newCompanyId = compRes.insertId;

      const created = {
        id: newCompanyId,
        user_id: newUserId,
        company_name,
        industry,
        website,
        contact_person,
        contact_email
      };

      return res.status(201).json({
        success: true,
        message: 'Company registered successfully.',
        company: created
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    if (inMem.Users.some(u => u.email.toLowerCase() === contact_email.toLowerCase())) {
      return res.status(409).json({ success: false, message: `Email '${contact_email}' is already registered.` });
    }

    const newUserId = inMem.Users.length + 1;
    inMem.Users.push({
      id: newUserId,
      email: contact_email,
      password: passwordHash,
      role: 'hr',
      created_at: new Date()
    });

    const newCompanyId = inMem.Companies.length + 1;
    const newComp = {
      id: newCompanyId,
      user_id: newUserId,
      company_name,
      industry,
      website,
      contact_person,
      contact_email,
      created_at: new Date()
    };
    inMem.Companies.push(newComp);

    res.status(201).json({
      success: true,
      message: 'Company registered successfully.',
      company: newComp
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create company: ' + err.message });
  }
}

// PUT /api/placement/companies/:id - Edit company details
async function updateCompany(req, res) {
  try {
    const companyId = parseInt(req.params.id, 10);
    if (isNaN(companyId)) {
      return res.status(400).json({ success: false, message: 'Invalid company ID.' });
    }

    const {
      company_name,
      industry,
      website,
      contact_person,
      contact_email
    } = req.body;

    if (db.isMySQLConnected()) {
      const existing = await db.query('SELECT * FROM Companies WHERE id = ?', [companyId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Company not found.' });
      }

      await db.query(
        `UPDATE Companies 
         SET company_name = COALESCE(?, company_name),
             industry = COALESCE(?, industry),
             website = COALESCE(?, website),
             contact_person = COALESCE(?, contact_person),
             contact_email = COALESCE(?, contact_email)
         WHERE id = ?`,
        [
          company_name !== undefined ? company_name : null,
          industry !== undefined ? industry : null,
          website !== undefined ? website : null,
          contact_person !== undefined ? contact_person : null,
          contact_email !== undefined ? contact_email : null,
          companyId
        ]
      );

      if (contact_email) {
        await db.query('UPDATE Users SET email = ? WHERE id = ?', [contact_email, existing[0].user_id]);
      }

      const updated = await db.query('SELECT * FROM Companies WHERE id = ?', [companyId]);
      return res.json({
        success: true,
        message: 'Company details updated successfully.',
        company: updated[0]
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const comp = inMem.Companies.find(c => c.id === companyId);
    if (!comp) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    if (company_name !== undefined) comp.company_name = company_name;
    if (industry !== undefined) comp.industry = industry;
    if (website !== undefined) comp.website = website;
    if (contact_person !== undefined) comp.contact_person = contact_person;
    if (contact_email !== undefined) comp.contact_email = contact_email;

    const user = inMem.Users.find(u => u.id === comp.user_id);
    if (user && contact_email) user.email = contact_email;

    res.json({
      success: true,
      message: 'Company details updated successfully.',
      company: comp
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update company: ' + err.message });
  }
}

// DELETE /api/placement/companies/:id - Delete company
async function deleteCompany(req, res) {
  try {
    const companyId = parseInt(req.params.id, 10);
    if (isNaN(companyId)) {
      return res.status(400).json({ success: false, message: 'Invalid company ID.' });
    }

    if (db.isMySQLConnected()) {
      const existing = await db.query('SELECT * FROM Companies WHERE id = ?', [companyId]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Company not found.' });
      }

      // Deleting user cascades to Companies, PlacementDrives, etc.
      await db.query('DELETE FROM Users WHERE id = ?', [existing[0].user_id]);

      return res.json({
        success: true,
        message: `Company #${companyId} and associated account deleted successfully.`
      });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    const cIndex = inMem.Companies.findIndex(c => c.id === companyId);
    if (cIndex === -1) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }
    const comp = inMem.Companies[cIndex];
    inMem.Companies.splice(cIndex, 1);
    const uIndex = inMem.Users.findIndex(u => u.id === comp.user_id);
    if (uIndex !== -1) inMem.Users.splice(uIndex, 1);

    // Cascade drives
    inMem.PlacementDrives = inMem.PlacementDrives.filter(d => d.company_id !== companyId);

    res.json({
      success: true,
      message: `Company #${companyId} and associated account deleted successfully.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete company: ' + err.message });
  }
}

module.exports = {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany
};
