module.exports = {
    apps: [{
        name: "noscam-bot",
        script: "./start.sh",
        stop_exit_codes: [0],
        exp_backoff_restart_delay: 250
    }]
}