import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { en_US, provideNzI18n } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import { FormsModule } from '@angular/forms';

import { routes } from './app.routes';
import { IconDefinition } from '@ant-design/icons-angular';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { 
  DollarOutline, 
  CalendarOutline, 
  FallOutline, 
  RiseOutline, 
  HomeOutline, 
  TeamOutline, 
  ArrowUpOutline, 
  ArrowDownOutline,
  PlusOutline,
  PlusCircleOutline,
  ContainerOutline,
  EditOutline,
  DeleteOutline,
  MenuUnfoldOutline,
  MenuFoldOutline,
  UserOutline,
  DashboardOutline,
  FormOutline,
  WalletOutline,
  LineChartOutline,
  FileTextOutline,
  SettingOutline,
  LockOutline,
  BgColorsOutline,
  FilePdfOutline,
  FileExcelOutline,
  SearchOutline,
  BankOutline,
  ShoppingCartOutline,
  FilterOutline,
  CoffeeOutline,
  SkinOutline,
  UpOutline,
  DownOutline,
  MoreOutline,
  StarOutline,
  DownloadOutline,
  BellOutline,
  CloseOutline,
  ReloadOutline,
  ExclamationCircleFill,
  ClockCircleOutline,
  LogoutOutline
} from '@ant-design/icons-angular/icons';

const icons: IconDefinition[] = [
  DollarOutline, 
  CalendarOutline, 
  FallOutline, 
  RiseOutline, 
  HomeOutline, 
  TeamOutline, 
  ArrowUpOutline, 
  ArrowDownOutline,
  PlusOutline,
  PlusCircleOutline,
  ContainerOutline,
  EditOutline,
  DeleteOutline,
  MenuUnfoldOutline,
  MenuFoldOutline,
  UserOutline,
  DashboardOutline,
  FormOutline,
  WalletOutline,
  LineChartOutline,
  FileTextOutline,
  SettingOutline,
  LockOutline,
  BgColorsOutline,
  FilePdfOutline,
  FileExcelOutline,
  SearchOutline,
  BankOutline,
  ShoppingCartOutline,
  FilterOutline,
  CoffeeOutline,
  SkinOutline,
  UpOutline,
  DownOutline,
  MoreOutline,
  StarOutline,
  DownloadOutline,
  BellOutline,
  CloseOutline,
  ReloadOutline,
  ExclamationCircleFill,
  ClockCircleOutline,
  LogoutOutline
];

registerLocaleData(en);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(),
    provideNzIcons(icons),
    provideNzI18n(en_US),
    importProvidersFrom(FormsModule)
  ]
};
