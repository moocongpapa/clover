import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface RegionDistrict {
  name: string;
  towns: string[];
}

export interface RegionSigungu {
  name: string;
  districts: RegionDistrict[];
  towns: string[];
}

export interface RegionSido {
  name: string;
  sigungu: RegionSigungu[];
}

export interface RegionsPayload {
  meta: { updatedAt: string; source: string; version: number };
  tree: RegionSido[];
}

@Injectable()
export class RegionsService implements OnModuleInit {
  private data: RegionsPayload | null = null;

  onModuleInit() {
    this.load();
  }

  private load() {
    const filePath = path.join(process.cwd(), 'data', 'regions.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    this.data = JSON.parse(raw) as RegionsPayload;
  }

  getAll() {
    if (!this.data) {
      this.load();
    }
    return this.data!;
  }
}
