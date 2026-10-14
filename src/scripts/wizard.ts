// Logica client del modulo guidato: passi, validazione, campi condizionali,
// bozza in sessionStorage, preparazione foto, Turnstile e invio a /api/richiesta.
import { errorMessage } from '../lib/forms/messages';
import { allFields, isVisible } from '../lib/forms/resolve';
import { formatBytes, uniqueFileName } from '../lib/forms/files';
import { validateFields, validateForm } from '../lib/forms/validate';
import type { FieldConfig, FieldError, FormData as Data, ResolvedForm } from '../lib/forms/types';
import { prepareFile } from './compress';

interface TurnstileApi {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  getResponse(widgetId: string): string | undefined;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onFeniksTurnstile?: () => void;
  }
}

let turnstileLoading: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  turnstileLoading ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    window.onFeniksTurnstile = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onFeniksTurnstile';
    script.async = true;
    script.onerror = () => reject(new Error('turnstile'));
    document.head.append(script);
  });
  return turnstileLoading;
}

interface Draft {
  step: number;
  data: Record<string, unknown>;
}

class Wizard {
  private readonly form: ResolvedForm;
  private readonly strings: Record<string, string>;
  private readonly formEl: HTMLFormElement;
  private readonly steps: HTMLElement[];
  private readonly fields: FieldConfig[];
  private readonly files: Record<string, File[]> = {};
  private readonly draftKey: string;
  private current = 0;
  private turnstileId: string | undefined;
  private preparing = 0;

  constructor(private readonly root: HTMLElement) {
    this.form = JSON.parse(root.querySelector('[data-config]')?.textContent ?? '{}') as ResolvedForm;
    this.strings = JSON.parse(root.querySelector('[data-strings]')?.textContent ?? '{}') as Record<string, string>;
    this.formEl = root.querySelector('form') as HTMLFormElement;
    this.steps = [...root.querySelectorAll<HTMLElement>('[data-step]')];
    this.fields = allFields(this.form);
    this.draftKey = `feniks-bozza-${this.form.id}`;

    this.formEl.hidden = false;
    this.bind();
    const restored = this.restoreDraft();
    this.prefillFromQuery();
    this.updateVisibility();
    this.showStep(restored?.step ?? 0, false);
  }

  private s(key: string, params: Record<string, string | number> = {}): string {
    const template = this.strings[`wizard.${key}`] ?? key;
    return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
  }

  private bind() {
    this.root.querySelector('[data-next]')?.addEventListener('click', () => this.next());
    this.root.querySelector('[data-back]')?.addEventListener('click', () => this.showStep(this.current - 1));
    this.formEl.addEventListener('submit', (event) => {
      event.preventDefault();
      if (this.current < this.steps.length - 1) this.next();
      else void this.submit();
    });
    this.formEl.addEventListener('input', (event) => this.onInput(event));
    this.formEl.addEventListener('change', (event) => this.onInput(event));
    for (const wrapper of this.root.querySelectorAll<HTMLElement>('[data-file-field]')) {
      const name = wrapper.dataset.field as string;
      const input = wrapper.querySelector<HTMLInputElement>('input[type=file]');
      input?.addEventListener('change', () => void this.addFiles(name, input));
    }
  }

  private onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.type === 'file') return;
    this.updateVisibility();
    this.clearError(target.name);
    this.saveDraft();
  }

  private inputs(name: string): HTMLInputElement[] {
    return [...this.formEl.querySelectorAll<HTMLInputElement>(`[name="${CSS.escape(name)}"]`)];
  }

  /** Raccoglie i valori dei campi dal DOM (i file come elenco di nomi). */
  private collect(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const field of this.fields) {
      const elements = this.inputs(field.nome);
      switch (field.tipo) {
        case 'file':
          data[field.nome] = (this.files[field.nome] ?? []).map((file) => file.name);
          break;
        case 'consenso':
          data[field.nome] = elements[0]?.checked ?? false;
          break;
        case 'sceltaMultipla':
        case 'sceltaImmagini':
        case 'scelta': {
          const first = elements[0];
          if (first && first.tagName === 'SELECT') {
            data[field.nome] = first.value;
          } else {
            const checked = elements.filter((element) => element.checked).map((element) => element.value);
            data[field.nome] = field.tipo === 'scelta' || (field.tipo === 'sceltaImmagini' && !field.multipla) ? (checked[0] ?? '') : checked;
          }
          break;
        }
        default:
          data[field.nome] = elements[0]?.value ?? '';
      }
    }
    return data;
  }

  private setValue(field: FieldConfig, value: unknown) {
    const elements = this.inputs(field.nome);
    if (field.tipo === 'file') return;
    if (field.tipo === 'consenso') {
      // Il consenso non si ripristina mai: deve essere dato di nuovo
      return;
    }
    const first = elements[0];
    if (!first) return;
    if (first.tagName === 'SELECT' || first.tagName === 'TEXTAREA' || !['radio', 'checkbox'].includes(first.type)) {
      first.value = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
      return;
    }
    const values = Array.isArray(value) ? value.map(String) : [String(value)];
    for (const element of elements) element.checked = values.includes(element.value);
  }

  private updateVisibility() {
    const data = this.collect() as Data;
    for (const wrapper of this.root.querySelectorAll<HTMLElement>('[data-show-if]')) {
      const field = this.fields.find((item) => item.nome === wrapper.dataset.field);
      if (!field) continue;
      const visible = isVisible(field, data);
      wrapper.hidden = !visible;
      for (const element of wrapper.querySelectorAll<HTMLInputElement>('input, select, textarea')) element.disabled = !visible;
    }
  }

  private showStep(index: number, moveFocus = true) {
    const total = this.steps.length;
    this.current = Math.max(0, Math.min(index, total - 1));
    this.steps.forEach((step, stepIndex) => (step.hidden = stepIndex !== this.current));
    const label = this.root.querySelector('[data-progress-label]');
    const titolo = this.form.passi[this.current]?.titolo ?? '';
    if (label) label.textContent = `${this.s('step')} ${this.current + 1} ${this.s('of')} ${total} – ${titolo}`;
    const bar = this.root.querySelector<HTMLElement>('[data-progress-bar]');
    if (bar) bar.style.width = `${((this.current + 1) / total) * 100}%`;
    const last = this.current === total - 1;
    this.toggle('[data-back]', this.current > 0);
    this.toggle('[data-next]', !last);
    this.toggle('[data-submit]', last);
    this.hideSummary();
    if (last) void this.renderTurnstile();
    if (moveFocus) {
      this.root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.steps[this.current]?.querySelector<HTMLElement>('.step-title')?.focus({ preventScroll: true });
    }
  }

  private toggle(selector: string, visible: boolean) {
    const element = this.root.querySelector<HTMLElement>(selector);
    if (element) element.hidden = !visible;
  }

  private validateStep(index: number): boolean {
    const step = this.form.passi[index];
    if (!step) return true;
    const result = validateFields(step.campi, this.collect(), this.files);
    this.showErrors(step.campi, result.errors);
    return result.ok;
  }

  private next() {
    if (this.preparing > 0) return;
    if (!this.validateStep(this.current)) return;
    this.showStep(this.current + 1);
    this.saveDraft();
  }

  private clearError(name: string) {
    const message = this.root.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(name)}"]`);
    if (message && !message.hidden) {
      message.hidden = true;
      message.textContent = '';
      for (const element of this.inputs(name)) element.removeAttribute('aria-invalid');
      this.root.querySelector(`[data-field="${CSS.escape(name)}"]`)?.removeAttribute('aria-invalid');
    }
  }

  private showErrors(fields: FieldConfig[], errors: Record<string, FieldError>) {
    const items: { id: string; text: string }[] = [];
    for (const field of fields) {
      const message = this.root.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(field.nome)}"]`);
      const error = errors[field.nome];
      const elements = this.inputs(field.nome);
      if (!message) continue;
      if (error) {
        const text = errorMessage(error, this.strings);
        message.textContent = text;
        message.hidden = false;
        for (const element of elements) element.setAttribute('aria-invalid', 'true');
        if (elements.length > 1) this.root.querySelector(`[data-field="${CSS.escape(field.nome)}"]`)?.setAttribute('aria-invalid', 'true');
        if (elements[0]) items.push({ id: elements[0].id, text: `${this.labelOf(field)}: ${text}` });
      } else {
        message.hidden = true;
        message.textContent = '';
        for (const element of elements) element.removeAttribute('aria-invalid');
      }
    }
    if (items.length > 0) this.showSummary(items);
  }

  private labelOf(field: FieldConfig): string {
    return field.etichetta ?? field.nome;
  }

  private showSummary(items: { id: string; text: string }[], text = this.s('errorSummary')) {
    const summary = this.root.querySelector<HTMLElement>('[data-error-summary]');
    if (!summary) return;
    summary.replaceChildren();
    const intro = document.createElement('p');
    intro.style.margin = '0';
    intro.textContent = text;
    summary.append(intro);
    if (items.length > 0) {
      const list = document.createElement('ul');
      for (const item of items) {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${item.id}`;
        link.textContent = item.text;
        link.addEventListener('click', (event) => {
          event.preventDefault();
          document.getElementById(item.id)?.focus();
        });
        li.append(link);
        list.append(li);
      }
      summary.append(list);
    }
    summary.hidden = false;
    summary.focus();
  }

  private hideSummary() {
    const summary = this.root.querySelector<HTMLElement>('[data-error-summary]');
    if (summary) summary.hidden = true;
  }

  // --- File ---

  private usedNames(): Set<string> {
    return new Set(Object.values(this.files).flatMap((list) => list.map((file) => file.name)));
  }

  private async addFiles(name: string, input: HTMLInputElement) {
    const picked = [...(input.files ?? [])];
    input.value = '';
    if (picked.length === 0) return;
    const wrapper = input.closest<HTMLElement>('[data-file-field]');
    const status = wrapper?.querySelector<HTMLElement>('[data-file-status]');
    this.preparing += 1;
    if (status) status.textContent = this.s('files.preparing');
    try {
      const prepared = await Promise.all(picked.map((file) => prepareFile(file)));
      const list = (this.files[name] ??= []);
      for (const file of prepared) {
        const unique = uniqueFileName(file.name, this.usedNames());
        list.push(unique === file.name ? file : new File([file], unique, { type: file.type, lastModified: file.lastModified }));
      }
    } finally {
      this.preparing -= 1;
    }
    this.renderFiles(name);
    const field = this.fields.find((item) => item.nome === name);
    if (field) {
      const result = validateFields([field], this.collect(), this.files);
      this.showErrors([field], result.errors);
      if (result.ok) this.hideSummary();
    }
  }

  private renderFiles(name: string) {
    const wrapper = this.root.querySelector<HTMLElement>(`[data-file-field][data-field="${CSS.escape(name)}"]`);
    const listEl = wrapper?.querySelector<HTMLElement>('[data-file-list]');
    const status = wrapper?.querySelector<HTMLElement>('[data-file-status]');
    if (!listEl) return;
    for (const img of listEl.querySelectorAll('img')) URL.revokeObjectURL(img.src);
    listEl.replaceChildren();
    const files = this.files[name] ?? [];
    files.forEach((file, index) => {
      const item = document.createElement('li');
      item.className = 'file-item';
      if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = '';
        item.append(img);
      } else {
        const icon = document.createElement('span');
        icon.className = 'file-icon';
        icon.textContent = (file.name.split('.').pop() ?? '').toUpperCase();
        icon.setAttribute('aria-hidden', 'true');
        item.append(icon);
      }
      const label = document.createElement('span');
      label.className = 'file-name';
      label.textContent = `${file.name} (${formatBytes(file.size)})`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = this.s('files.remove');
      remove.setAttribute('aria-label', `${this.s('files.remove')} ${file.name}`);
      remove.addEventListener('click', () => {
        files.splice(index, 1);
        this.renderFiles(name);
        this.clearError(name);
        wrapper?.querySelector<HTMLElement>('.file-button')?.focus();
      });
      item.append(label, remove);
      listEl.append(item);
    });
    if (status) status.textContent = files.length > 0 ? this.s('files.count', { n: files.length }) : '';
  }

  // --- Bozza ---

  private saveDraft() {
    try {
      const data = this.collect();
      for (const field of this.fields) if (field.tipo === 'file' || field.tipo === 'consenso') delete data[field.nome];
      const draft: Draft = { step: this.current, data };
      sessionStorage.setItem(this.draftKey, JSON.stringify(draft));
    } catch {
      // sessionStorage non disponibile (es. navigazione privata): si prosegue senza bozza
    }
  }

  private restoreDraft(): Draft | undefined {
    try {
      const raw = sessionStorage.getItem(this.draftKey);
      if (!raw) return undefined;
      const draft = JSON.parse(raw) as Draft;
      let restored = false;
      for (const field of this.fields) {
        const value = draft.data[field.nome];
        if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) continue;
        this.setValue(field, value);
        restored = true;
      }
      if (!restored) return undefined;
      const notice = this.root.querySelector<HTMLElement>('[data-draft-notice]');
      if (notice) notice.hidden = false;
      return draft;
    } catch {
      return undefined;
    }
  }

  private clearDraft() {
    try {
      sessionStorage.removeItem(this.draftKey);
    } catch {
      // niente da fare
    }
  }

  /** Precompila le scelte dai parametri dell'URL, es. ?profilo=Installatore */
  private prefillFromQuery() {
    const params = new URLSearchParams(window.location.search);
    for (const field of this.fields) {
      const value = params.get(field.nome);
      if (!value || !['scelta', 'testo'].includes(field.tipo)) continue;
      const current = this.collect()[field.nome];
      if (current) continue;
      this.setValue(field, value);
    }
  }

  // --- Turnstile e invio ---

  private async renderTurnstile() {
    const container = this.root.querySelector<HTMLElement>('[data-turnstile]');
    if (!container || this.turnstileId !== undefined) return;
    try {
      const turnstile = await loadTurnstile();
      if (this.turnstileId !== undefined) return;
      this.turnstileId = turnstile.render(container, {
        sitekey: this.root.dataset.siteKey,
        language: this.root.dataset.locale ?? 'it',
        appearance: 'interaction-only',
        callback: () => this.clearError('_turnstile'),
      });
    } catch {
      this.showFieldMessage('_turnstile', this.s('err.network'));
    }
  }

  private showFieldMessage(name: string, text: string) {
    const message = this.root.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(name)}"]`);
    if (!message) return;
    message.textContent = text;
    message.hidden = false;
  }

  private stepOfField(name: string): number {
    return this.form.passi.findIndex((passo) => passo.campi.some((field) => field.nome === name));
  }

  private async submit() {
    if (this.preparing > 0) return;
    const data = this.collect();
    const result = validateForm(this.form, data, this.files);
    if (!result.ok) {
      const firstStep = Math.min(...Object.keys(result.errors).map((name) => this.stepOfField(name)).filter((index) => index >= 0));
      if (Number.isFinite(firstStep) && firstStep !== this.current) this.showStep(firstStep);
      const step = this.form.passi[Number.isFinite(firstStep) ? firstStep : this.current];
      if (step) this.showErrors(step.campi, result.errors);
      return;
    }

    const token = this.turnstileId !== undefined ? window.turnstile?.getResponse(this.turnstileId) : undefined;
    if (!token) {
      this.showFieldMessage('_turnstile', this.s('err.turnstile'));
      this.showSummary([], this.s('err.turnstile'));
      return;
    }

    const body = new FormData();
    body.append('form_id', this.form.id);
    body.append('dati', JSON.stringify(result.clean));
    body.append('turnstile_token', token);
    body.append('locale', this.root.dataset.locale ?? 'it');
    for (const [field, list] of Object.entries(this.files)) {
      if (!(field in result.clean)) continue;
      for (const file of list) body.append('file[]', file, file.name);
    }

    const button = this.root.querySelector<HTMLButtonElement>('[data-submit]');
    const back = this.root.querySelector<HTMLButtonElement>('[data-back]');
    const label = button?.textContent ?? '';
    if (button) {
      button.disabled = true;
      button.textContent = this.s('sending');
    }
    if (back) back.disabled = true;

    try {
      const response = await fetch('/api/richiesta', { method: 'POST', body });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        errore?: string;
        errori?: Record<string, FieldError>;
      };
      if (response.ok && payload.ok && payload.id) {
        this.onSuccess(payload.id);
        return;
      }
      if (payload.errori && Object.keys(payload.errori).length > 0) {
        const name = Object.keys(payload.errori)[0] as string;
        const stepIndex = this.stepOfField(name);
        if (stepIndex >= 0) {
          this.showStep(stepIndex);
          this.showErrors(this.form.passi[stepIndex]?.campi ?? [], payload.errori);
          return;
        }
      }
      this.showSummary([], payload.errore ?? this.s('err.server'));
    } catch {
      this.showSummary([], this.s('err.network'));
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = label;
      }
      if (back) back.disabled = false;
      if (this.turnstileId !== undefined) window.turnstile?.reset(this.turnstileId);
    }
  }

  private onSuccess(id: string) {
    this.clearDraft();
    this.formEl.hidden = true;
    this.root.querySelector<HTMLElement>('.wizard-intro')?.setAttribute('hidden', '');
    const success = this.root.querySelector<HTMLElement>('[data-success]');
    const text = this.root.querySelector<HTMLElement>('[data-success-text]');
    if (text) text.textContent = this.s('success.text', { id });
    if (success) {
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'start' });
      success.focus({ preventScroll: true });
    }
  }
}

export function initWizards() {
  for (const root of document.querySelectorAll<HTMLElement>('[data-wizard]')) {
    if (root.dataset.ready) continue;
    root.dataset.ready = 'true';
    new Wizard(root);
  }
}
