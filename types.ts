
export interface Message {
  role: 'user' | 'model';
  text: string;
  thinking?: string;
  files?: Array<{
    name: string;
    mimeType: string;
    data: string;
  }>;
}

export enum Section {
  CONTENT = 'NỘI DUNG THAM MƯU',
  SOURCES = 'CĂN CỨ TRI THỨC'
}
