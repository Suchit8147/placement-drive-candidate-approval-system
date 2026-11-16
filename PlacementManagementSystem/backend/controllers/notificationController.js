const db = require('../config/db');

// GET /api/placement/notifications - List notifications
async function getAllNotifications(req, res) {
  try {
    const { user_id, status } = req.query;

    if (db.isMySQLConnected()) {
      let sql = `
        SELECT n.*, u.email, u.role
        FROM Notifications n
        JOIN Users u ON n.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (user_id) {
        sql += ' AND n.user_id = ?';
        params.push(parseInt(user_id, 10));
      }
      if (status) {
        sql += ' AND n.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY n.id DESC';
      const rows = await db.query(sql, params);
      return res.json({ success: true, notifications: rows || [] });
    }

    // In-memory fallback
    const inMem = db.getInMemStore();
    let notifs = inMem.Notifications;

    if (user_id) {
      notifs = notifs.filter(n => n.user_id === parseInt(user_id, 10));
    }
    if (status) {
      notifs = notifs.filter(n => n.status === status);
    }

    const mapped = notifs.map(n => {
      const user = inMem.Users.find(u => u.id === n.user_id);
      return {
        ...n,
        email: user ? user.email : '',
        role: user ? user.role : 'user'
      };
    }).sort((a, b) => b.id - a.id);

    res.json({ success: true, notifications: mapped });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve notifications: ' + err.message });
  }
}

// GET /api/placement/notifications/:id
async function getNotificationById(req, res) {
  try {
    const notifId = parseInt(req.params.id, 10);
    if (isNaN(notifId)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }

    if (db.isMySQLConnected()) {
      const rows = await db.query('SELECT * FROM Notifications WHERE id = ?', [notifId]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Notification not found.' });
      }
      return res.json({ success: true, notification: rows[0] });
    }

    const inMem = db.getInMemStore();
    const n = inMem.Notifications.find(item => item.id === notifId);
    if (!n) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    res.json({ success: true, notification: n });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve notification: ' + err.message });
  }
}

// POST /api/placement/notifications - Create notification
async function createNotification(req, res) {
  try {
    const { user_id, title, message } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'user_id, title, and message are required.'
      });
    }

    const parsedUserId = parseInt(user_id, 10);

    if (db.isMySQLConnected()) {
      const insertRes = await db.query(
        'INSERT INTO Notifications (user_id, title, message, status) VALUES (?, ?, ?, ?)',
        [parsedUserId, title, message, 'unread']
      );

      const created = {
        id: insertRes.insertId,
        user_id: parsedUserId,
        title,
        message,
        status: 'unread',
        created_at: new Date()
      };

      return res.status(201).json({
        success: true,
        message: 'Notification sent successfully.',
        notification: created
      });
    }

    const inMem = db.getInMemStore();
    const newNotif = {
      id: inMem.Notifications.length + 1,
      user_id: parsedUserId,
      title,
      message,
      status: 'unread',
      created_at: new Date()
    };
    inMem.Notifications.push(newNotif);

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully.',
      notification: newNotif
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send notification: ' + err.message });
  }
}

// PUT /api/placement/notifications/:id/read - Mark notification as read
async function markAsRead(req, res) {
  try {
    const notifId = parseInt(req.params.id, 10);
    if (isNaN(notifId)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }

    if (db.isMySQLConnected()) {
      await db.query("UPDATE Notifications SET status = 'read' WHERE id = ?", [notifId]);
      return res.json({ success: true, message: `Notification #${notifId} marked as read.` });
    }

    const inMem = db.getInMemStore();
    const n = inMem.Notifications.find(item => item.id === notifId);
    if (!n) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    n.status = 'read';

    res.json({ success: true, message: `Notification #${notifId} marked as read.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark notification: ' + err.message });
  }
}

// DELETE /api/placement/notifications/:id - Delete notification
async function deleteNotification(req, res) {
  try {
    const notifId = parseInt(req.params.id, 10);
    if (isNaN(notifId)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }

    if (db.isMySQLConnected()) {
      await db.query('DELETE FROM Notifications WHERE id = ?', [notifId]);
      return res.json({ success: true, message: `Notification #${notifId} deleted successfully.` });
    }

    const inMem = db.getInMemStore();
    const idx = inMem.Notifications.findIndex(n => n.id === notifId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    inMem.Notifications.splice(idx, 1);

    res.json({ success: true, message: `Notification #${notifId} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete notification: ' + err.message });
  }
}

module.exports = {
  getAllNotifications,
  getNotificationById,
  createNotification,
  markAsRead,
  deleteNotification
};
