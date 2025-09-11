export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  flightAssignment: 'alpha' | 'tango' | 'both';
  eventType: 'drill' | 'class';
  isPast: boolean;
}

export interface FileUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface CommandWithHistory {
  id: string;
  name: string;
  type: 'drill' | 'class';
  metadata?: string;
  lastAlphaExecution?: Date;
  lastTangoExecution?: Date;
  createdAt: Date;
}
