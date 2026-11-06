import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/config', () => ({ DEMO_CODE: '123456' }));

import { tracks } from '../src/data/catalog';
import { demoApi } from '../src/data/demo-api';
import { authMessage, passwordProblems, passwordStrength, validEmail } from '../src/domain/auth';
import { cycleSeconds, cyclesFor, EXERCISES, exerciseById } from '../src/domain/exercises';
import { LIFE_TEST, MIND_JOURNEY } from '../src/domain/life-test';

describe('login e cadastro', () => {
  it('valida e-mail e senha (8 caracteres, letra e número)', () => {
    expect(validEmail('ana@exemplo.com')).toBe(true);
    expect(validEmail('ana@exemplo')).toBe(false);
    expect(passwordProblems('abc')).toEqual(['8 caracteres', 'um número']);
    expect(passwordProblems('vivah1234')).toEqual([]);
    expect(passwordStrength('vivah1234')).toBe(2);
    expect(passwordStrength('vivah-1234-forte')).toBe(3);
  });

  it('traduz os erros do servidor de login', () => {
    expect(authMessage('Invalid login credentials')).toBe('E-mail ou senha incorretos.');
    expect(authMessage('User already registered')).toContain('já tem conta');
    expect(authMessage('Token has expired or is invalid')).toContain('Código inválido');
    expect(authMessage('Email rate limit exceeded')).toContain('Muitas tentativas');
  });

  describe('demonstração', () => {
    beforeEach(async () => { await demoApi.signOut(); });

    it('cria conta, confirma com código e entra com a senha', async () => {
      const email = `nova${Date.now()}@exemplo.com`;
      expect(await demoApi.signUp('Nova Aluna', email, 'senha1234')).toEqual({ needsCode: true });
      await expect(demoApi.signIn(email, 'senha1234')).rejects.toThrow('Confirme');
      await expect(demoApi.confirmSignUp(email, '000000')).rejects.toThrow('Código inválido');
      await demoApi.confirmSignUp(email, '123456');
      expect((await demoApi.getProfile()).fullName).toBe('Nova Aluna');
      await demoApi.signOut();
      await expect(demoApi.signIn(email, 'errada123')).rejects.toThrow('E-mail ou senha incorretos.');
      await demoApi.signIn(email, 'senha1234');
      expect((await demoApi.getSessionUser())?.email).toBe(email);
      await expect(demoApi.signUp('Outra', email, 'senha1234')).rejects.toThrow('já tem conta');
    });

    it('recupera a senha com código', async () => {
      await demoApi.requestPasswordReset('ana@exemplo.com');
      await demoApi.resetPassword('ana@exemplo.com', '123456', 'novasenha9');
      await demoApi.signOut();
      await demoApi.signIn('ana@exemplo.com', 'novasenha9');
      expect((await demoApi.getProfile()).email).toBe('ana@exemplo.com');
      await demoApi.resetPassword('ana@exemplo.com', '123456', 'vivah1234');
    });
  });
});

describe('ordem da jornada e teste inicial', () => {
  it('as trilhas vêm sempre na ordem da jornada Vivah', () => {
    expect([...tracks].sort((a, b) => a.sort - b.sort).map((t) => t.id)).toEqual(MIND_JOURNEY);
    expect(tracks.every((t) => t.status === 'live')).toBe(true);
  });

  it('perguntas curtas, sem palavras perdidas', () => {
    for (const q of LIFE_TEST) {
      expect(q.prompt.length).toBeLessThanOrEqual(70);
      expect(q.prompt).not.toMatch(/\bvem\b/i);
      expect(q.prompt.trim().endsWith('?')).toBe(true);
    }
  });
});

describe('respiração guiada', () => {
  it('toda respiração tem som e duração por fase', () => {
    const breaths = EXERCISES.filter((e) => e.kind === 'breath');
    expect(breaths.map((e) => e.id)).toEqual(['respiracao', 'suspiro', 'coerencia', 'caixa']);
    for (const e of breaths) for (const p of e.phases!) {
      expect(['inspire', 'segure', 'solte']).toContain(p.cue);
      expect(p.label.split(' ').length).toBeLessThanOrEqual(3);
    }
  });

  it('a duração escolhida vira número de ciclos', () => {
    const r = exerciseById('respiracao')!;
    expect(cycleSeconds(r)).toBe(10);
    expect(cyclesFor(r, 1)).toBe(6);
    expect(cyclesFor(exerciseById('coerencia')!, 5)).toBe(30);
    expect(cyclesFor(exerciseById('suspiro')!, 3)).toBe(16);
  });
});
