# Scheduled Tasks

Scheduled Tasks allow you to automate AI workflows by running prompts on a defined schedule. This is useful for recurring reports, monitoring tasks, data collection, and automated content generation.

## Overview

The Task Scheduler enables:
- **Cron-based Scheduling**: Use standard cron expressions for flexible timing
- **AI Prompt Execution**: Run any prompt through your configured AI providers
- **Result Tracking**: View execution history with outputs and errors
- **Pause/Resume**: Control task execution without deletion

## Accessing Tasks

### Via NavRail
1. Click the **Tasks** icon in the NavRail (if enabled)
2. Or access through the sidebar's Extensions view

### Via Sidebar
1. Navigate to the Tasks sidebar view
2. View all scheduled tasks with their status

## Task Status

| Status | Description | Icon |
|--------|-------------|------|
| **Active** | Running on schedule | 🟢 Play |
| **Paused** | Temporarily stopped | 🟡 Pause |
| **Completed** | Finished (non-recurring) | 🔵 Check |
| **Failed** | Last execution failed | 🔴 X |
| **Cancelled** | Manually cancelled | ⚪ Alert |

## Creating a Task

### Basic Steps
1. Click the **+** button in the Tasks panel
2. Fill in task details:
   - **Title**: Descriptive name
   - **Description**: What the task does (optional)
   - **Prompt**: The AI prompt to execute
   - **Schedule**: Cron expression or preset

### Task Configuration

#### Title
Choose a clear, descriptive name:
- ✅ "Daily Tech News Summary"
- ✅ "Hourly System Health Check"
- ❌ "Task 1"

#### Prompt
The AI prompt that will be executed. You can use:
- **Static prompts**: Fixed text executed each time
- **Template variables**: Dynamic content (coming soon)

**Examples**:
```
Summarize the top 5 technology news stories from today.
```

```
Analyze the following metrics and highlight any anomalies:
- CPU usage trends
- Memory utilization
- Error rates
```

#### Schedule (Cron Expression)
Standard cron format: `minute hour day-of-month month day-of-week`

| Expression | Description |
|------------|-------------|
| `0 * * * *` | Every hour, on the hour |
| `0 9 * * *` | Daily at 9:00 AM |
| `0 9 * * 1-5` | Weekdays at 9:00 AM |
| `0 0 * * 0` | Weekly on Sunday at midnight |
| `0 0 1 * *` | Monthly on the 1st at midnight |
| `*/15 * * * *` | Every 15 minutes |

**Quick Presets**:
- Every 5 minutes
- Every hour
- Daily at 9 AM
- Weekly on Monday

### Advanced Options

#### Provider Selection
Choose which AI provider handles the task:
- **Default**: Uses routing rules
- **Specific**: Select a provider/model

#### Retry Policy
- **Retry Count**: How many times to retry on failure
- **Retry Delay**: Wait time between retries

#### Timeout
Maximum execution time before task is cancelled.

## Managing Tasks

### Viewing Task Details
1. Click on a task in the list
2. View expanded information:
   - Full prompt text
   - Next scheduled execution
   - Execution statistics
   - Recent history

### Task Actions

| Action | Description |
|--------|-------------|
| **Pause** | Stop scheduled execution (preserves history) |
| **Resume** | Restart paused task |
| **Execute Now** | Run immediately, outside schedule |
| **Delete** | Remove task and history |

### Pausing a Task
1. Click the pause button on an active task
2. Task stops running on schedule
3. Click resume to restart

### Manual Execution
1. Click the refresh/run button on any task
2. Task executes immediately
3. Result appears in history
4. Does not affect scheduled timing

### Deleting a Task
1. Click the delete button
2. Confirm deletion
3. Task and history are permanently removed

## Execution History

Each task maintains a history of executions:

### History Entry Details
- **Timestamp**: When execution occurred
- **Status**: Success, error, or running
- **Duration**: How long execution took
- **Output**: Full AI response
- **Error**: Error message if failed

### Viewing History
1. Click on a task
2. Click the history icon (🕒)
3. Expand entries to see details
4. History shows last 50 executions

### Execution Statuses

| Status | Meaning |
|--------|---------|
| ✅ Success | Completed without errors |
| ❌ Error | Failed with error message |
| 🔄 Running | Currently executing |

## Task Statistics

Each task tracks:
- **Total Runs**: Number of executions
- **Success Count**: Successful completions
- **Error Count**: Failed executions
- **Success Rate**: Percentage successful

## Use Cases

### Daily Reports
```
Schedule: 0 8 * * 1-5 (Weekdays at 8 AM)
Prompt: Generate a morning briefing with:
- Key calendar events
- Priority tasks
- Weather forecast
- Inspiring quote
```

### Periodic Monitoring
```
Schedule: */30 * * * * (Every 30 minutes)
Prompt: Check the following services and report any issues:
- API health endpoints
- Database connections
- Queue depths
```

### Content Generation
```
Schedule: 0 10 * * 1 (Mondays at 10 AM)
Prompt: Create a weekly social media post about
[topic] that's engaging and informative.
```

### Data Collection
```
Schedule: 0 0 * * * (Daily at midnight)
Prompt: Compile and summarize the day's key metrics
from the provided data sources.
```

## Best Practices

### Prompt Design
1. **Be Specific**: Clear instructions produce better results
2. **Set Context**: Include relevant background information
3. **Define Format**: Specify output structure if needed
4. **Handle Errors**: Include fallback instructions

### Scheduling
1. **Avoid Peak Times**: Don't overload during busy hours
2. **Stagger Tasks**: Spread multiple tasks across time
3. **Consider Timezone**: Schedule in your local time
4. **Test First**: Use "Execute Now" before scheduling

### Monitoring
1. **Check History**: Regularly review execution results
2. **Watch Error Rates**: Investigate repeated failures
3. **Adjust Prompts**: Refine based on output quality
4. **Manage Costs**: Be aware of API usage from scheduled tasks

## Troubleshooting

### Task Not Running
1. Verify task status is "Active"
2. Check cron expression syntax
3. Ensure AI provider is configured
4. Verify application is running at scheduled time

### Execution Failures
1. Check error message in history
2. Verify AI provider connectivity
3. Review prompt for issues
4. Check if timeout was exceeded

### Unexpected Results
1. Review prompt clarity
2. Check if context is needed
3. Try different model/provider
4. Test prompt manually first

### High Error Rate
1. Review error patterns in history
2. Check provider availability
3. Increase timeout if needed
4. Add retry policy

## Limitations

- **Requires Running Application**: Tasks only execute when the app is open
- **Rate Limits**: Subject to AI provider rate limits
- **Local Execution**: Currently no remote/server execution
- **Single Instance**: Tasks don't duplicate across devices

## Future Enhancements

Planned features:
- Template variables (date, random, etc.)
- Conditional execution
- Task dependencies
- Output destinations (file, email, webhook)
- Background service for always-on execution
