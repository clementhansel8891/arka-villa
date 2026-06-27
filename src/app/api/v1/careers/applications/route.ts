import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * POST /api/v1/careers/applications
 * Accepts multipart/form-data with application fields and CV file.
 * Saves the CV to the local uploads directory and stores application data.
 *
 * In production this would save to MinIO/S3 and PostgreSQL.
 * For now, files go to `public/uploads/cv/` and application data
 * is stored in a JSON file at `public/uploads/cv/applications.json`.
 */

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'cv');
const APPLICATIONS_FILE = path.join(UPLOAD_DIR, 'applications.json');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface StoredApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  name: string;
  email: string;
  phone: string;
  linkedIn: string;
  coverLetter: string;
  cvFilename: string;
  cvOriginalName: string;
  cvSize: number;
  status: string;
  appliedAt: string;
}

async function getApplications(): Promise<StoredApplication[]> {
  try {
    const { readFile } = await import('fs/promises');
    const data = await readFile(APPLICATIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveApplications(apps: StoredApplication[]): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(APPLICATIONS_FILE, JSON.stringify(apps, null, 2));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();

    // Extract fields
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = (formData.get('phone') as string) || '';
    const linkedIn = (formData.get('linkedIn') as string) || '';
    const coverLetter = (formData.get('coverLetter') as string) || '';
    const jobId = formData.get('jobId') as string;
    const jobTitle = formData.get('jobTitle') as string;
    const cvFile = formData.get('cv') as File | null;

    // Validate required fields
    if (!name || !email || !jobId || !jobTitle) {
      return NextResponse.json(
        { error: 'Name, email, job ID, and job title are required.' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format.' },
        { status: 400 }
      );
    }

    let cvFilename = '';
    let cvOriginalName = '';
    let cvSize = 0;

    // Handle CV file upload
    if (cvFile && cvFile.size > 0) {
      // Validate file size
      if (cvFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'CV file must be under 10MB.' },
          { status: 400 }
        );
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(cvFile.type)) {
        return NextResponse.json(
          { error: 'CV must be a PDF or Word document (.pdf, .doc, .docx).' },
          { status: 400 }
        );
      }

      // Generate unique filename
      const ext = path.extname(cvFile.name);
      cvFilename = `${randomUUID()}${ext}`;
      cvOriginalName = cvFile.name;
      cvSize = cvFile.size;

      // Ensure upload directory exists
      await mkdir(UPLOAD_DIR, { recursive: true });

      // Save file
      const bytes = await cvFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(path.join(UPLOAD_DIR, cvFilename), buffer);
    }

    // Store application
    const application: StoredApplication = {
      id: randomUUID(),
      jobId,
      jobTitle,
      name,
      email,
      phone,
      linkedIn,
      coverLetter,
      cvFilename,
      cvOriginalName,
      cvSize,
      status: 'new',
      appliedAt: new Date().toISOString(),
    };

    const apps = await getApplications();
    apps.push(application);
    await saveApplications(apps);

    return NextResponse.json(
      { success: true, applicationId: application.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Application submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/careers/applications
 * Returns all applications (for dashboard use). In production, requires auth.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const apps = await getApplications();
    return NextResponse.json({ applications: apps });
  } catch (error) {
    console.error('Fetch applications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications.' },
      { status: 500 }
    );
  }
}
