import { query } from "../config/db.js";

export const logAudit = async ({ userId, action, entity, entityId, oldValues, newValues, req }) => {
  try {
    const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
    const userAgent = req?.get?.("User-Agent") || null;

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, action, entity, entityId, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null, ipAddress, userAgent]
    );
  } catch (error) {
    console.error("Audit log error:", error.message);
  }
};

export const createAuditMiddleware = (action, entity) => {
  return async (req, res, next) => {
    res.locals.auditAction = action;
    res.locals.auditEntity = entity;
    next();
  };
};

export const logAuditAfter = async (req, res, next) => {
  if (res.locals.auditLogged) return next();
  
  const { auditAction, auditEntity, auditEntityId, auditOldValues, auditNewValues } = res.locals;
  const userId = req.user?.id || null;
  
  if (auditAction && auditEntity && auditEntityId) {
    await logAudit({
      userId,
      action: auditAction,
      entity: auditEntity,
      entityId: auditEntityId,
      oldValues: auditOldValues,
      newValues: auditNewValues,
      req
    });
    res.locals.auditLogged = true;
  }
  next();
};