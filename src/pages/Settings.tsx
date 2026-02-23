import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Copy, Check, ExternalLink, Upload, Loader2, CreditCard, QrCode, Smartphone, Eye, EyeOff, Info } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';
import { useRestaurants } from '../hooks/useRestaurants';
import { uploadToBucket } from '../lib/supabase';
import i18n from '../i18n';
import toast from 'react-hot-toast';
import type { PaymentSettings } from '../lib/types';

const languages = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'th', label: 'ไทย' },
];

// ─── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-white/15'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ─── Secret input (show/hide) ─────────────────────────────────────────────
function SecretInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-10 text-sm text-white outline-none focus:border-primary/50 placeholder-gray-600 transition-colors disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function Settings() {
  const { t } = useTranslation();
  const { language, setLanguage, currentRestaurant, setCurrentRestaurant } = useStore();
  const { update } = useRestaurants();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(currentRestaurant?.logo_url ?? null);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Payment settings — read from restaurant.settings JSONB
  const [paySettings, setPaySettings] = useState<PaymentSettings>(() =>
    (currentRestaurant?.settings ?? {}) as PaymentSettings,
  );
  const [savingPay, setSavingPay] = useState(false);

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    setLanguage(code as 'fr' | 'en' | 'th');
  };

  // Build the customer menu URL
  const menuUrl = currentRestaurant?.slug
    ? `${window.location.origin}/menu/${currentRestaurant.slug}`
    : null;

  const copyUrl = async () => {
    if (!menuUrl) return;
    await navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printQR = () => {
    if (!qrRef.current || !menuUrl) return;
    const svgEl = qrRef.current.querySelector('svg');
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>QR Code — ${currentRestaurant?.name ?? 'Menu'}</title>
  <style>
    body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: white; font-family: Arial, sans-serif; padding: 20px; }
    .title { font-size: 28px; font-weight: bold; margin-bottom: 8px; text-align: center; }
    .subtitle { font-size: 16px; color: #555; margin-bottom: 24px; text-align: center; }
    svg { width: 280px; height: 280px; }
    .url { margin-top: 16px; font-size: 12px; color: #888; word-break: break-all; text-align: center; max-width: 300px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="title">${currentRestaurant?.name ?? 'Menu'}</div>
  <div class="subtitle">${t('settings.qrSubtitle')}</div>
  ${svgData}
  <div class="url">${menuUrl}</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`);
    win.document.close();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !currentRestaurant) return;
    setUploadingLogo(true);
    try {
      const logo_url = await uploadToBucket({
        bucket: 'dishes',
        file: logoFile,
        pathPrefix: 'restaurant-logos',
      });
      await update.mutateAsync({ id: currentRestaurant.id, logo_url });
      setCurrentRestaurant({ ...currentRestaurant, logo_url });
      setLogoFile(null);
      setLogoInputKey((k) => k + 1);
      toast.success(t('settings.logoSaved'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('alerts.error');
      toast.error(message);
    } finally {
      setUploadingLogo(false);
    }
  };

  // ── Save payment settings ──────────────────────────────────────────────
  const handleSavePayment = async () => {
    if (!currentRestaurant) return;
    setSavingPay(true);
    try {
      // Merge into existing settings JSONB
      const merged = { ...(currentRestaurant.settings ?? {}), ...paySettings };
      await update.mutateAsync({ id: currentRestaurant.id, settings: merged as Record<string, unknown> });
      setCurrentRestaurant({ ...currentRestaurant, settings: merged });
      toast.success(t('settings.paymentSaved'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('alerts.error'));
    } finally {
      setSavingPay(false);
    }
  };

  const updatePay = (patch: Partial<PaymentSettings>) =>
    setPaySettings((prev) => ({ ...prev, ...patch }));

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-16">
      <div>
        <p className="text-sm text-gray-400">{t('settings.title')}</p>
        <h1 className="text-2xl font-bold text-white">{t('settings.title')}</h1>
      </div>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      {currentRestaurant && (
        <Card title={t('settings.logo')}>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">{t('settings.logoHint')}</p>

            {logoPreview && (
              <div className="flex items-center gap-4">
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="h-20 w-20 rounded-2xl object-cover border border-white/10 shadow-lg"
                />
                <p className="text-xs text-gray-400">{t('settings.logoCurrent')}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <label className="flex flex-col gap-1 text-sm text-gray-200 flex-1">
                <span className="text-xs uppercase tracking-wide text-gray-400">{t('settings.logoUpload')}</span>
                <input
                  key={logoInputKey}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={uploadingLogo}
                />
              </label>
              <Button
                type="button"
                variant="primary"
                onClick={handleLogoUpload}
                disabled={!logoFile || uploadingLogo}
              >
                {uploadingLogo ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> {t('common.loading')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload size={16} /> {t('settings.logoSave')}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── QR Code ──────────────────────────────────────────────────────── */}
      {menuUrl && (
        <Card title={t('settings.qrCode')}>
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-400 text-center">{t('settings.qrDescription')}</p>

            <div ref={qrRef} className="bg-white p-4 rounded-2xl shadow-lg">
              <QRCodeSVG value={menuUrl} size={220} level="H" includeMargin={false} />
            </div>

            <p className="font-bold text-white text-lg">{currentRestaurant?.name}</p>

            <div className="flex items-center gap-2 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <span className="text-xs text-gray-400 flex-1 truncate">{menuUrl}</span>
              <button onClick={copyUrl} className="text-gray-400 hover:text-white transition-colors flex-shrink-0">
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
              <a href={menuUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors flex-shrink-0">
                <ExternalLink size={16} />
              </a>
            </div>

            <button
              onClick={printQR}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
            >
              <Printer size={18} />
              {t('settings.printQR')}
            </button>
          </div>
        </Card>
      )}

      {/* ── Payment Methods ───────────────────────────────────────────────── */}
      {currentRestaurant && (
        <Card title={t('settings.payment')}>
          <div className="space-y-6">
            <p className="text-sm text-gray-400">{t('settings.paymentHint')}</p>

            {/* Deployment note */}
            <div className="flex gap-2 px-3 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <span>{t('settings.paymentEdgeFnNote')}</span>
            </div>

            {/* ── Cash (always available) ──────────────────────────────── */}
            <div className="flex items-start gap-4 py-4 border-b border-white/8">
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-xl">
                💵
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{t('settings.paymentCash')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('settings.paymentCashDesc')}</p>
              </div>
              <Toggle
                checked={paySettings.cash_enabled !== false}
                onChange={(v) => updatePay({ cash_enabled: v })}
              />
            </div>

            {/* ── Stripe ───────────────────────────────────────────────── */}
            <div className="space-y-3 py-4 border-b border-white/8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                  <CreditCard size={18} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">Stripe</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('settings.paymentStripeDesc')}</p>
                </div>
                <Toggle
                  checked={!!paySettings.stripe_enabled}
                  onChange={(v) => updatePay({ stripe_enabled: v })}
                />
              </div>

              {paySettings.stripe_enabled && (
                <div className="space-y-2 pl-14">
                  <label className="text-xs text-gray-400 uppercase tracking-wide">
                    {t('settings.stripePublishableKey')}
                  </label>
                  <SecretInput
                    value={paySettings.stripe_publishable_key ?? ''}
                    onChange={(v) => updatePay({ stripe_publishable_key: v })}
                    placeholder="pk_live_..."
                  />
                  <p className="text-xs text-gray-600">{t('settings.stripeKeyHint')}</p>
                  <div className="text-xs text-violet-400/70 bg-violet-500/8 border border-violet-500/15 rounded-lg px-3 py-2">
                    {t('settings.stripeSecretNote')}
                    <code className="ml-1 font-mono text-violet-300">
                      supabase secrets set STRIPE_SECRET_KEY=sk_live_...
                    </code>
                  </div>
                </div>
              )}
            </div>

            {/* ── Omise PromptPay ──────────────────────────────────────── */}
            <div className="space-y-3 py-4 border-b border-white/8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center">
                  <QrCode size={18} className="text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">Omise — PromptPay</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('settings.paymentOmiseDesc')}</p>
                </div>
                <Toggle
                  checked={!!paySettings.omise_enabled}
                  onChange={(v) => updatePay({ omise_enabled: v })}
                />
              </div>

              {paySettings.omise_enabled && (
                <div className="space-y-2 pl-14">
                  <div className="text-xs text-sky-400/70 bg-sky-500/8 border border-sky-500/15 rounded-lg px-3 py-2">
                    {t('settings.omiseSecretNote')}
                    <code className="ml-1 font-mono text-sky-300">
                      supabase secrets set OMISE_SECRET_KEY=skey_live_...
                    </code>
                  </div>
                </div>
              )}
            </div>

            {/* ── SumUp ────────────────────────────────────────────────── */}
            <div className="space-y-3 py-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                  <Smartphone size={18} className="text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">SumUp</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('settings.paymentSumupDesc')}</p>
                </div>
                <Toggle
                  checked={!!paySettings.sumup_enabled}
                  onChange={(v) => updatePay({ sumup_enabled: v })}
                />
              </div>

              {paySettings.sumup_enabled && (
                <div className="space-y-2 pl-14">
                  <div className="text-xs text-orange-400/70 bg-orange-500/8 border border-orange-500/15 rounded-lg px-3 py-2">
                    {t('settings.sumupSecretNote')}
                    <code className="ml-1 font-mono text-orange-300">
                      supabase secrets set SUMUP_API_KEY=sup_sk_...
                    </code>
                  </div>
                </div>
              )}
            </div>

            {/* Save button */}
            <Button
              type="button"
              variant="primary"
              onClick={handleSavePayment}
              disabled={savingPay}
              className="w-full"
            >
              {savingPay ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> {t('common.loading')}
                </span>
              ) : (
                t('actions.save')
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Delivery Settings ────────────────────────────────────────────── */}
      {currentRestaurant && (
        <Card title={t('settings.delivery')}>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">{t('settings.deliveryHint')}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-sm">{t('settings.deliveryEnable')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('settings.deliveryEnableDesc')}</p>
              </div>
              <Toggle
                checked={!!((currentRestaurant.settings as Record<string, unknown>)?.delivery_enabled)}
                onChange={async (val) => {
                  const merged = { ...(currentRestaurant.settings ?? {}), delivery_enabled: val };
                  await update.mutateAsync({ id: currentRestaurant.id, settings: merged as Record<string, unknown> });
                  setCurrentRestaurant({ ...currentRestaurant, settings: merged });
                  toast.success(t('alerts.success'));
                }}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-400 block mb-1">
                {t('settings.deliveryFee')}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                defaultValue={Number((currentRestaurant.settings as Record<string, unknown>)?.delivery_fee ?? 0)}
                onBlur={async (e) => {
                  const fee = parseFloat(e.target.value) || 0;
                  const merged = { ...(currentRestaurant.settings ?? {}), delivery_fee: fee };
                  await update.mutateAsync({ id: currentRestaurant.id, settings: merged as Record<string, unknown> });
                  setCurrentRestaurant({ ...currentRestaurant, settings: merged });
                  toast.success(t('alerts.success'));
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50 transition-colors"
                placeholder="0"
              />
              <p className="text-xs text-gray-600 mt-1">{t('settings.deliveryFeeHint')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Language ─────────────────────────────────────────────────────── */}
      <Card title={t('settings.language')}>
        <Select value={language} onChange={(e) => changeLang(e.target.value)}>
          {languages.map((lng) => (
            <option key={lng.code} value={lng.code} className="text-black">
              {lng.label}
            </option>
          ))}
        </Select>
      </Card>
    </div>
  );
}
