import { randomUUID } from 'crypto';

function makeCertificateNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `LL-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function makeVerificationCode() {
  return randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
}

export async function listCertificates(db: any, organizationId: string, filters: any = {}) {
  let q = db
    .selectFrom('certificates as c')
    .leftJoin('users as u', 'u.id', 'c.student_id')
    .leftJoin('assessments as a', 'a.id', 'c.assessment_id')
    .where('c.organization_id', '=', organizationId);

  if (filters.studentId) q = q.where('c.student_id', '=', filters.studentId);
  if (filters.assessmentId) q = q.where('c.assessment_id', '=', filters.assessmentId);
  if (filters.status) q = q.where('c.status', '=', filters.status);

  const rows = await q
    .select([
      'c.id',
      'c.student_assessment_id as studentAssessmentId',
      'c.certificate_number as certificateNumber',
      'c.verification_code as verificationCode',
      'c.template_name as templateName',
      'c.title',
      'c.recipient_name as recipientName',
      'c.issued_at as issuedAt',
      'c.status',
      'c.revoked_at as revokedAt',
      'c.score_snapshot as scoreSnapshot',
      'u.full_name as learnerName',
      'u.email as learnerEmail',
      'a.title as assessmentTitle'
    ])
    .orderBy('c.issued_at', 'desc')
    .execute();

  return rows.map((r: any) => ({
    id: r.id,
    studentAssessmentId: r.studentAssessmentId,
    certificateNumber: r.certificateNumber,
    verificationCode: r.verificationCode,
    templateName: r.templateName,
    title: r.title,
    recipientName: r.recipientName,
    issuedAt: r.issuedAt,
    status: r.status,
    revokedAt: r.revokedAt,
    scoreSnapshot: r.scoreSnapshot == null ? null : Number(r.scoreSnapshot),
    learnerName: r.learnerName,
    learnerEmail: r.learnerEmail,
    assessmentTitle: r.assessmentTitle
  }));
}

export async function getCertificateById(db: any, certificateId: string) {
  const row = await db
    .selectFrom('certificates as c')
    .leftJoin('users as u', 'u.id', 'c.student_id')
    .leftJoin('assessments as a', 'a.id', 'c.assessment_id')
    .where('c.id', '=', certificateId)
    .select([
      'c.*',
      'u.full_name as learnerName',
      'u.email as learnerEmail',
      'a.title as assessmentTitle'
    ])
    .executeTakeFirst();

  return row || null;
}

export async function issueCertificate(db: any, assignmentId: string, context: any, payload: any = {}) {
  const sa = await db
    .selectFrom('student_assessments as sa')
    .innerJoin('assessments as a', 'a.id', 'sa.assessment_id')
    .leftJoin('users as u', 'u.id', 'sa.student_id')
    .where('sa.id', '=', assignmentId)
    .select([
      'sa.id as studentAssessmentId',
      'sa.assessment_id as assessmentId',
      'sa.student_id as studentId',
      'sa.status',
      'sa.score',
      'sa.points_earned as pointsEarned',
      'sa.total_points as totalPoints',
      'sa.passed',
      'a.organization_id as organizationId',
      'a.title as assessmentTitle',
      'u.full_name as learnerName'
    ])
    .executeTakeFirst();

  if (!sa) throw new Error('Assignment not found');
  if (sa.organizationId !== context.organizationId) throw new Error('Access denied');
  if (!['submitted', 'graded'].includes(sa.status)) throw new Error('Certificate can only be issued for submitted/graded assignments');
  if (!sa.passed) throw new Error('Certificate can only be issued for passed assignments');

  const existing = await db
    .selectFrom('certificates')
    .select(['id'])
    .where('student_assessment_id', '=', assignmentId)
    .executeTakeFirst();
  if (existing) throw new Error('Certificate already issued for this assignment');

  const inserted = await db
    .insertInto('certificates')
    .values({
      organization_id: context.organizationId,
      student_assessment_id: sa.studentAssessmentId,
      student_id: sa.studentId,
      assessment_id: sa.assessmentId,
      issued_by: context.userId,
      certificate_number: makeCertificateNumber(),
      verification_code: makeVerificationCode(),
      template_name: payload.templateName || 'completion',
      title: payload.title || `${sa.assessmentTitle} Certificate`,
      recipient_name: payload.recipientName || sa.learnerName || 'Learner',
      score_snapshot: sa.score,
      points_earned_snapshot: sa.pointsEarned,
      total_points_snapshot: sa.totalPoints,
      metadata_json: payload.metadata ? JSON.stringify(payload.metadata) : null
    } as any)
    .returningAll()
    .executeTakeFirst();

  return inserted;
}

export async function revokeCertificate(db: any, certificateId: string, context: any, reason?: string) {
  const existing = await db
    .selectFrom('certificates')
    .select(['id', 'organization_id', 'status'])
    .where('id', '=', certificateId)
    .executeTakeFirst();
  if (!existing) throw new Error('Certificate not found');
  if (existing.organization_id !== context.organizationId) throw new Error('Access denied');
  if (existing.status === 'revoked') return existing;

  return db
    .updateTable('certificates')
    .set({
      status: 'revoked',
      revoked_at: new Date(),
      revoked_reason: reason || null
    } as any)
    .where('id', '=', certificateId)
    .returningAll()
    .executeTakeFirst();
}
