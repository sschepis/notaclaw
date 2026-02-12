import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AgentTeam } from '../../shared/agent-types';

const TEAMS_FILE = 'teams.json';

export class TeamManager {
    private teamsPath: string;
    private teams: AgentTeam[] = [];

    constructor() {
        this.teamsPath = path.join(app.getPath('userData'), TEAMS_FILE);
        this.loadTeams();
    }

    private async loadTeams() {
        try {
            const data = await fs.readFile(this.teamsPath, 'utf-8');
            this.teams = JSON.parse(data);
        } catch (error) {
            // If file doesn't exist or is invalid, start with empty list
            this.teams = [];
        }
    }

    private async saveTeams() {
        try {
            await fs.writeFile(this.teamsPath, JSON.stringify(this.teams, null, 2));
        } catch (error) {
            console.error('Failed to save teams:', error);
        }
    }

    async createTeam(name: string, agentIds: string[]): Promise<AgentTeam> {
        const newTeam: AgentTeam = {
            id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            agentIds,
            created: Date.now(),
            updated: Date.now(),
            status: 'active'
        };
        this.teams.push(newTeam);
        await this.saveTeams();
        return newTeam;
    }

    async getTeams(): Promise<AgentTeam[]> {
        return this.teams;
    }

    async getTeam(id: string): Promise<AgentTeam | undefined> {
        return this.teams.find(t => t.id === id);
    }

    async updateTeam(id: string, updates: Partial<AgentTeam>): Promise<AgentTeam | null> {
        const index = this.teams.findIndex(t => t.id === id);
        if (index === -1) return null;

        this.teams[index] = { ...this.teams[index], ...updates, updated: Date.now() };
        await this.saveTeams();
        return this.teams[index];
    }

    async deleteTeam(id: string): Promise<boolean> {
        const initialLength = this.teams.length;
        this.teams = this.teams.filter(t => t.id !== id);
        if (this.teams.length !== initialLength) {
            await this.saveTeams();
            return true;
        }
        return false;
    }
}
